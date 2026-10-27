import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  computeDiffSha256,
  isPatchableSourcePath,
  isRepositoryAllowlisted,
  isSafeRepositoryFilePath,
  redactSecrets,
} from '@/lib/security/redact';
import {
  DiagnosisSchema,
  HealthSmokeSchema,
  PatchProposalSchema,
} from '@/lib/ai/schemas';
import { extractJsonObjectFromText, getNebiusConfig } from '@/lib/ai/nebius';
import {
  applyStructuredEdits,
  evaluateTestOutcome,
} from '@/lib/agent/patch-applier';
import { applyUnifiedDiffToSlice } from '@/lib/agent/orchestrator';
import { parseVitestCounts } from '@/lib/sandbox/runner';

describe('Security, Nebius Schema Validation, and Deterministic Patch Verification', () => {
  it('1. redacts GitHub tokens, JWTs, API keys, and env assignments from untrusted logs', () => {
    const raw = [
      'Error connecting with token ghp_1234567890abcdefghijklmnopqrstuvwx',
      'Authorization: Bearer sk-proj-9876543210abcdefghijklmnop',
      'NEBIUS_API_KEY=v1.secret_nebius_token_value_1234567890',
    ].join('\n');

    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain('ghp_1234567890');
    expect(redacted).not.toContain('sk-proj-9876543210');
    expect(redacted).not.toContain('v1.secret_nebius_token_value_1234567890');
    expect(redacted).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(redacted).toContain('[REDACTED_AUTH_HEADER]');
    expect(redacted).toContain('[REDACTED_ENV_SECRET]');
  });

  it('2. blocks path traversal, .env, workflows, lockfiles, and package.json modifications', () => {
    expect(isSafeRepositoryFilePath('src/pricing.ts')).toBe(true);
    expect(isSafeRepositoryFilePath('tests/pricing.test.ts')).toBe(true);
    expect(isSafeRepositoryFilePath('../etc/passwd')).toBe(false);
    expect(isSafeRepositoryFilePath('/etc/passwd')).toBe(false);
    expect(isSafeRepositoryFilePath('.env.local')).toBe(false);
    expect(isSafeRepositoryFilePath('.github/workflows/ci.yml')).toBe(false);
    expect(isSafeRepositoryFilePath('pnpm-lock.yaml')).toBe(false);

    expect(isPatchableSourcePath('src/pricing.ts')).toBe(true);
    expect(isPatchableSourcePath('package.json')).toBe(false);
    expect(isPatchableSourcePath('.env')).toBe(false);
  });

  it('3. enforces repository allowlist and rejects arbitrary repositories', () => {
    expect(isRepositoryAllowlisted('malinikochar/repomedic-fixture')).toBe(true);
    expect(isRepositoryAllowlisted('torvalds/linux')).toBe(false);
    expect(isRepositoryAllowlisted('evil/prompt-injection-repo')).toBe(false);
  });

  it('4. parses Nebius Nemotron JSON responses with <think> blocks and validates strict Zod schemas', () => {
    const rawModelOutput = `<think>
Let's inspect src/pricing.ts line 45. It uses logical OR instead of nullish coalescing.
</think>
\`\`\`json
{
  "rootCause": "In src/pricing.ts line 45, resolveTaxRatePercent uses taxRatePercent || defaultRatePercent which treats 0 as falsy.",
  "confidenceLabel": "high_evidence",
  "evidencePaths": [
    {
      "path": "src/pricing.ts",
      "lines": "43-49",
      "reason": "Logical OR overrides explicit 0% tax rate"
    }
  ],
  "repairPlan": "Replace || with ?? in resolveTaxRatePercent."
}
\`\`\``;

    const extracted = extractJsonObjectFromText(rawModelOutput);
    const parsed = DiagnosisSchema.parse(extracted);
    expect(parsed.confidenceLabel).toBe('high_evidence');
    expect(parsed.evidencePaths[0].path).toBe('src/pricing.ts');

    // Rejects unsafe path in PatchProposalSchema
    expect(() =>
      PatchProposalSchema.parse({
        rationale: 'Malicious workflow modification attempt',
        touchedPaths: ['.github/workflows/pwn.yml'],
        edits: [
          {
            path: '.github/workflows/pwn.yml',
            searchBlock: 'on: push',
            replaceBlock: 'on: workflow_dispatch',
          },
        ],
        riskNotes: 'None',
      }),
    ).toThrow();

    const smoke = HealthSmokeSchema.parse({
      status: 'ready',
      engine: 'nvidia/nemotron-3-super-120b-a12b',
      capabilities: ['root_cause_analysis'],
    });
    expect(smoke.status).toBe('ready');

    const cfg = getNebiusConfig();
    expect(cfg.baseUrl).toContain('tokenfactory');
  });

  it('5. applies minimal patch to buggy-order-service fixture and verifies deterministic test evaluation', () => {
    const fixtureFile = path.join(
      process.cwd(),
      'fixtures',
      'buggy-order-service',
      'src',
      'pricing.ts',
    );
    const originalContent = fs.readFileSync(fixtureFile, 'utf8');

    const applied = applyStructuredEdits(
      [{ path: 'src/pricing.ts', content: originalContent }],
      [
        {
          path: 'src/pricing.ts',
          searchBlock: 'const effective = taxRatePercent || defaultRatePercent;',
          replaceBlock: 'const effective = taxRatePercent ?? defaultRatePercent;',
        },
      ],
    );

    expect(applied.touchedPaths).toEqual(['src/pricing.ts']);
    expect(applied.unifiedDiff).toContain('-  const effective = taxRatePercent || defaultRatePercent;');
    expect(applied.unifiedDiff).toContain('+  const effective = taxRatePercent ?? defaultRatePercent;');
    expect(applied.diffSha256).toHaveLength(64);
    expect(computeDiffSha256(applied.unifiedDiff)).toBe(applied.diffSha256);

    const reconstructed = applyUnifiedDiffToSlice(
      [{ path: 'src/pricing.ts', content: originalContent }],
      applied.unifiedDiff,
    );
    expect(reconstructed[0].content).toContain(
      'const effective = taxRatePercent ?? defaultRatePercent;',
    );

    // Deterministic verification checks
    const verifiedOutcome = evaluateTestOutcome(
      { exitCode: 1, command: 'npx vitest run', passed: 7, failed: 1 },
      { exitCode: 0, command: 'npx vitest run', passed: 8, failed: 0 },
    );
    expect(verifiedOutcome.isVerified).toBe(true);

    const inconclusiveOutcome = evaluateTestOutcome(
      { exitCode: 0, command: 'npx vitest run', passed: 8, failed: 0 },
      { exitCode: 0, command: 'npx vitest run', passed: 8, failed: 0 },
    );
    expect(inconclusiveOutcome.isVerified).toBe(false);
    expect(inconclusiveOutcome.reason).toContain('Inconclusive baseline');

    const counts = parseVitestCounts('Tests  1 failed | 7 passed (8)');
    expect(counts).toEqual({ passed: 7, failed: 1 });
  });
});
