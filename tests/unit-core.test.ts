import { describe, expect, it } from 'vitest';
import {
  isPatchableSourcePath,
  isSafeRepositoryFilePath,
  redactSecrets,
} from '@/lib/security/redact';
import {
  CopilotActionSchema,
  DiagnosisSchema,
  HealthSmokeSchema,
  PatchProposalSchema,
} from '@/lib/ai/schemas';
import {
  extractJsonObjectFromText,
  repairLiteralControlCharsInJsonStrings,
} from '@/lib/ai/nebius';
import {
  applyStructuredEdits,
  evaluateTestOutcome,
} from '@/lib/agent/patch-applier';
import { getResendConfig } from '@/lib/email/resend';
import { analyzePatchSecurityAndBlastRadius } from '@/lib/security/patch-scanner';

describe('RepoMedic Core Deterministic Unit Tests', () => {
  it('1. redacts API tokens, GitHub PATs, Nebius keys, Resend keys, and JWTs from logs', () => {
    const raw =
      'Error with ghp_1234567890abcdefghijklmnopqrstuvwx and v1.abcdef1234567890abcdefghijklmnopqrstuvwx and re_abcdef1234567890abcd and Authorization: Bearer secretToken123456789';
    const cleaned = redactSecrets(raw);
    expect(cleaned).not.toContain('ghp_1234567890');
    expect(cleaned).not.toContain('v1.abcdef1234567890');
    expect(cleaned).not.toContain('re_abcdef1234567890abcd');
    expect(cleaned).not.toContain('secretToken123456789');
    expect(cleaned).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(cleaned).toContain('[REDACTED_NEBIUS_KEY]');
    expect(cleaned).toContain('[REDACTED_RESEND_KEY]');
    expect(cleaned).toContain('[REDACTED_AUTH_HEADER]');
  });

  it('2. enforces path traversal and forbidden file protections', () => {
    expect(isSafeRepositoryFilePath('src/pricing.ts')).toBe(true);
    expect(isSafeRepositoryFilePath('../etc/passwd')).toBe(false);
    expect(isSafeRepositoryFilePath('.env.local')).toBe(false);
    expect(isSafeRepositoryFilePath('.github/workflows/ci.yml')).toBe(false);

    expect(isPatchableSourcePath('src/pricing.ts')).toBe(true);
    expect(isPatchableSourcePath('package.json')).toBe(false);
    expect(isPatchableSourcePath('pnpm-lock.yaml')).toBe(false);
  });

  it('3. parses structured JSON from Nemotron <think> blocks and normalizes snake_case keys', () => {
    const rawResponse = `<think>
Let me inspect src/pricing.ts line 45.
</think>
\`\`\`json
{
  "root_cause": "Percentage coupon value 15 is divided by 1000 instead of 100 in calculateDiscountCents.",
  "confidence_label": "high",
  "evidence_paths": [
    {
      "path": "src/pricing.ts",
      "lines": 45,
      "reason": "Math.round((subtotalCents * coupon.value) / 1000) under-calculates discount by 10x"
    }
  ],
  "repair_plan": "Replace divisor 1000 with 100 on line 45 of src/pricing.ts."
}
\`\`\``;
    const parsed = extractJsonObjectFromText(rawResponse, DiagnosisSchema);
    expect(parsed.confidenceLabel).toBe('high_evidence');
    expect(parsed.evidencePaths[0]?.path).toBe('src/pricing.ts');
    expect(parsed.evidencePaths[0]?.lines).toBe('45');
  });

  it('4. repairs literal newlines inside JSON string values and validates PatchProposalSchema', () => {
    const rawJsonWithLiteralNewline = `{
  "rationale": "Fix percentage coupon divisor from 1000 to 100 in calculateDiscountCents.",
  "edits": [
    {
      "path": "src/pricing.ts",
      "searchBlock": "const rawDiscountCents = Math.round((subtotalCents * coupon.value) / 1000);",
      "replaceBlock": "const rawDiscountCents = Math.round((subtotalCents * coupon.value) / 100);"
    }
  ]
}`;
    const repaired = repairLiteralControlCharsInJsonStrings(rawJsonWithLiteralNewline);
    const parsed = extractJsonObjectFromText(repaired, PatchProposalSchema);
    expect(parsed.touchedPaths).toEqual(['src/pricing.ts']);
    expect(parsed.edits).toHaveLength(1);
    expect(parsed.riskNotes.length).toBeGreaterThan(5);
  });

  it('5. computes deterministic SHA-256 diffSha256 and unified diff for surgical edits', () => {
    const originalFiles = [
      {
        path: 'src/pricing.ts',
        content: [
          'export function calculateDiscountCents(subtotalCents: number, value: number) {',
          '  const rawDiscountCents = Math.round((subtotalCents * value) / 1000);',
          '  return rawDiscountCents;',
          '}',
        ].join('\n'),
      },
    ];

    const result1 = applyStructuredEdits(originalFiles, [
      {
        path: 'src/pricing.ts',
        searchBlock: '  const rawDiscountCents = Math.round((subtotalCents * value) / 1000);',
        replaceBlock: '  const rawDiscountCents = Math.round((subtotalCents * value) / 100);',
      },
    ]);

    const result2 = applyStructuredEdits(originalFiles, [
      {
        path: 'src/pricing.ts',
        searchBlock: '  const rawDiscountCents = Math.round((subtotalCents * value) / 1000);',
        replaceBlock: '  const rawDiscountCents = Math.round((subtotalCents * value) / 100);',
      },
    ]);

    expect(result1.diffSha256).toHaveLength(64);
    expect(result1.diffSha256).toBe(result2.diffSha256);
    expect(result1.unifiedDiff).toContain('-  const rawDiscountCents = Math.round((subtotalCents * value) / 1000);');
    expect(result1.unifiedDiff).toContain('+  const rawDiscountCents = Math.round((subtotalCents * value) / 100);');
  });

  it('6. deterministically evaluates baseline failure -> candidate pass transition', () => {
    const verified = evaluateTestOutcome(
      { exitCode: 1, command: 'pnpm test', passed: 7, failed: 1 },
      { exitCode: 0, command: 'pnpm test', passed: 8, failed: 0 },
    );
    expect(verified.isVerified).toBe(true);

    const unverified = evaluateTestOutcome(
      { exitCode: 0, command: 'pnpm test', passed: 8, failed: 0 },
      { exitCode: 0, command: 'pnpm test', passed: 8, failed: 0 },
    );
    expect(unverified.isVerified).toBe(false);
  });

  it('7. validates HealthSmokeSchema', () => {
    const valid = HealthSmokeSchema.parse({
      status: 'ready',
      engine: 'nvidia/nemotron-3-super-120b-a12b',
      capabilities: ['root_cause_analysis', 'minimal_patch_generation'],
    });
    expect(valid.status).toBe('ready');
  });

  it('8. resolves Resend email notification configuration safely', () => {
    const cfg = getResendConfig();
    expect(typeof cfg.configured).toBe('boolean');
    expect(cfg.fromEmail).toContain('@');
  });

  it('9. audits candidate patches for security primitives, test tampering, and surgical blast radius', () => {
    const cleanAudit = analyzePatchSecurityAndBlastRadius({
      unifiedDiff: [
        '--- a/src/pricing.ts',
        '+++ b/src/pricing.ts',
        '@@ -42,3 +42,3 @@',
        '-  const effective = taxRatePercent || defaultRatePercent;',
        '+  const effective = taxRatePercent ?? defaultRatePercent;',
      ].join('\n'),
      expectedDiffSha256: 'd2986c85dfb2f8926d4bbf0dec800dc27c2aacc3c4c79de6c5b739148632536c',
      touchedPaths: ['src/pricing.ts'],
    });
    expect(cleanAudit.overallPassed).toBe(true);
    expect(cleanAudit.passedCount).toBe(6);
    expect(cleanAudit.surgicalScore).toBe(100);
    expect(cleanAudit.riskLevel).toBe('LOW');

    const unsafeAudit = analyzePatchSecurityAndBlastRadius({
      unifiedDiff: [
        '--- a/tests/pricing.test.ts',
        '+++ b/tests/pricing.test.ts',
        '@@ -10,2 +10,3 @@',
        '+  eval("process.exit(0)");',
        '+  it.skip("bypassed test", () => {});',
      ].join('\n'),
      expectedDiffSha256: 'd2986c85dfb2f8926d4bbf0dec800dc27c2aacc3c4c79de6c5b739148632536c',
      touchedPaths: ['tests/pricing.test.ts'],
    });
    expect(unsafeAudit.overallPassed).toBe(false);
    expect(unsafeAudit.riskLevel).toBe('HIGH');
  });

  it('10. validates CopilotActionSchema for multi-step Nemotron Co-Pilot synthesis and memory invariant learning', () => {
    const parsed = CopilotActionSchema.parse({
      title: 'SRE Post-Mortem: Zero-Rate Tax Coercion Regression',
      executiveSummary:
        'Logical OR (||) treated 0% tax rate as falsy in src/pricing.ts:43, substituting the 8.25% fallback rate. Replacing || with ?? restores explicit zero-rate tax-exempt semantics.',
      memoryInvariantLearned:
        'Always use nullish coalescing (??) instead of logical OR (||) for numeric rate parameters.',
      actionItems: [
        'Verify exit code 0 in isolated Vercel Sandbox',
        'Approve SHA-256 diff hash to open Draft PR',
      ],
      codeOrCommandSnippet: 'expect(calculateInvoiceTotal({ taxRatePercent: 0 })).toBe(1000);',
    });

    expect(parsed.title).toContain('SRE Post-Mortem');
    expect(parsed.actionItems.length).toBe(2);
    expect(parsed.memoryInvariantLearned).toContain('nullish coalescing');
  });
});
