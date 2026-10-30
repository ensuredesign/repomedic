import { describe, expect, it } from 'vitest';
import {
  runNebiusSmokeTest,
  verifyNebiusModelCatalog,
} from '@/lib/ai/nebius';
import { fetchPinnedRepositorySlice } from '@/lib/github/client';
import {
  getLangSmithConfig,
  syncAndShareRunBundleToLangSmith,
} from '@/lib/observability/langsmith';
import { executeLiveNebiusContreeSandbox } from '@/lib/sandbox/nebius-contree';
import {
  isVercelSandboxConfigured,
  runTestsInVercelSandbox,
} from '@/lib/sandbox/runner';
import { loadRunBundle } from '@/lib/supabase/bundle';
import { createClient } from '@supabase/supabase-js';
import { supabaseFetchWithRetry } from '@/lib/supabase/client';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://repomedic-sb.propixer.in';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc5MzExODA2MCwiZXhwIjo0OTQ4NzkxNjYwLCJyb2xlIjoiYW5vbiJ9.vS2m_mrjdEOo4NBjjiywvIswD7cNjsFGo1goXcU8uAE';

const hasNebiusApiKey = Boolean(process.env.NEBIUS_API_KEY?.trim());
const hasVercelSandboxAuth = isVercelSandboxConfigured();
const hasLangSmithApiKey = getLangSmithConfig().configured;

describe('M1 & M2 Live Integration Gate — Nebius Nemotron, GitHub Pinned Read, and Vercel Sandbox', () => {
  it('1. verifies Nebius Token Factory /models catalog and executes live NVIDIA Nemotron structured inference', async () => {
    const catalog = await verifyNebiusModelCatalog();

    if (!hasNebiusApiKey) {
      expect(catalog.configured).toBe(false);
      return;
    }

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

    expect(['github_api', 'local_fixture_fallback']).toContain(slice.source);
    expect(slice.files.some((f) => f.path === 'src/pricing.ts')).toBe(true);

    if (!hasVercelSandboxAuth) {
      expect(isVercelSandboxConfigured()).toBe(false);
      return;
    }

    expect(slice.source).toBe('github_api');
    expect(slice.pinnedSha).toBe('440255c3e1efe73a24d2cd92b90055c54c3e3549');

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

  it('3. executes live Nebius Token Factory Sandboxes (contree-sdk protocol) with apt-get qrencode and Python subprocess', async () => {
    const nebiusSandbox = await executeLiveNebiusContreeSandbox({
      runId: 'e1000000-0000-4000-8000-000000000002',
      incidentTitle: 'Zero percent tax rate overridden by default 8.5% rate on B2B tax-exempt orders',
      diffSha256: 'd2986c85dfb28d1a8a4b211f1d8c22949d6e4c198f73f5b2069f9d60ef5984ab',
      targetUrl: 'https://tokenfactory.nebius.com',
      forceFullRebuild: false,
    });

    if (!hasNebiusApiKey) {
      expect(nebiusSandbox.configured).toBe(false);
      expect(nebiusSandbox.liveExecuted).toBe(false);
      return;
    }

    console.log('Live Nebius Token Factory Sandbox (ConTree) Result:', {
      liveExecuted: nebiusSandbox.liveExecuted,
      error: nebiusSandbox.error,
      exitCode: nebiusSandbox.exitCode,
      totalDurationMs: nebiusSandbox.totalDurationMs,
      finalImageUuid: nebiusSandbox.finalImageUuid,
      steps: nebiusSandbox.steps.map((s) => ({
        stepNumber: s.stepNumber,
        label: s.label,
        exitCode: s.exitCode,
        elapsedMs: s.elapsedMs,
        operationUuid: s.operationUuid,
      })),
    });

    expect(nebiusSandbox.configured).toBe(true);
    expect(nebiusSandbox.liveExecuted).toBe(true);
    expect(nebiusSandbox.exitCode).toBe(0);
    expect(nebiusSandbox.steps.length).toBe(3);
    expect(nebiusSandbox.qrCodeAnsi).toContain('████');
    expect(nebiusSandbox.stdout).toContain('NEBIUS_SANDBOX_PATCH_VERIFICATION: PASS');
  }, 180000);

  it('4. syncs 6-span hierarchical trace tree, 4 online evaluator scores, and public share link to LangSmith (smith.langchain.com)', async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: supabaseFetchWithRetry },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: demoRun } = await anonClient
      .from('runs')
      .select('id')
      .eq('is_demo', true)
      .limit(1)
      .single();
    expect(demoRun?.id).toBeTruthy();

    const bundle = await loadRunBundle(anonClient, demoRun!.id);
    expect(bundle).not.toBeNull();

    const langsmithResult = await syncAndShareRunBundleToLangSmith(bundle!);

    expect(langsmithResult.spans.length).toBe(6);
    expect(langsmithResult.feedbackMetrics.length).toBe(4);
    expect(langsmithResult.publicShareUrl).toContain('https://smith.langchain.com/public/');

    if (!hasLangSmithApiKey) {
      expect(langsmithResult.configured).toBe(false);
      expect(langsmithResult.liveSynced).toBe(false);
      return;
    }

    console.log('Live LangSmith Trace & Evaluator Sync Result:', {
      liveSynced: langsmithResult.liveSynced,
      projectName: langsmithResult.projectName,
      rootTraceId: langsmithResult.rootTraceId,
      publicShareUrl: langsmithResult.publicShareUrl,
      spansCount: langsmithResult.spans.length,
      feedbackScores: langsmithResult.feedbackMetrics.map((m) => `${m.key}=${m.score}`),
    });

    expect(langsmithResult.configured).toBe(true);
    expect(langsmithResult.liveSynced).toBe(true);
  }, 60000);
});
