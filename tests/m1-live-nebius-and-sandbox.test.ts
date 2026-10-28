import { describe, expect, it } from 'vitest';
import {
  runNebiusSmokeTest,
  verifyNebiusModelCatalog,
} from '@/lib/ai/nebius';
import { fetchPinnedRepositorySlice } from '@/lib/github/client';
import { runTestsInVercelSandbox } from '@/lib/sandbox/runner';

describe('M1 & M2 Live Integration Gate — Nebius Nemotron, GitHub Pinned Read, and Vercel Sandbox', () => {
  it('1. verifies Nebius Token Factory /models catalog and executes live NVIDIA Nemotron structured inference', async () => {
    const catalog = await verifyNebiusModelCatalog();
    expect(catalog.configured).toBe(true);
    expect(catalog.reachable).toBe(true);
    expect(catalog.resolvedNvidiaModel).toBe('nvidia/nemotron-3-super-120b-a12b');

    const smoke = await runNebiusSmokeTest();
    console.log('Live Nebius Smoke Telemetry:', {
      modelId: smoke.modelId,
      requestId: smoke.requestId,
      latencyMs: smoke.latencyMs,
      inputTokens: smoke.inputTokens,
      outputTokens: smoke.outputTokens,
      payload: smoke.data,
    });

    expect(smoke.data.status).toBe('ready');
    expect(smoke.modelId.toLowerCase()).toContain('nemotron');
    expect(smoke.latencyMs).toBeGreaterThan(0);
  });

  it('2. fetches pinned commit from GitHub (ensuredesign/repomedic-fixture) and runs baseline in Vercel Sandbox', async () => {
    const slice = await fetchPinnedRepositorySlice({
      repositoryFullName: 'ensuredesign/repomedic-fixture',
      baseSha: '440255c3e1efe73a24d2cd92b90055c54c3e3549',
    });

    expect(slice.source).toBe('github_api');
    expect(slice.pinnedSha).toBe('440255c3e1efe73a24d2cd92b90055c54c3e3549');
    expect(slice.files.some((f) => f.path === 'src/pricing.ts')).toBe(true);

    const sandboxResult = await runTestsInVercelSandbox({
      files: slice.files,
      timeoutMs: 120000,
    });

    console.log('Live Vercel Sandbox Baseline Result:', {
      exitCode: sandboxResult.exitCode,
      passed: sandboxResult.passed,
      failed: sandboxResult.failed,
      durationMs: sandboxResult.durationMs,
      runnerId: sandboxResult.runnerId,
    });

    expect(sandboxResult.runnerId).toBe('vercel-sandbox');
    expect(sandboxResult.exitCode).not.toBe(0);
    expect(sandboxResult.failed).toBe(1);
    expect(sandboxResult.passed).toBe(7);
  });
});
