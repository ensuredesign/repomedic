import { NextResponse } from 'next/server';
import {
  getInstantLangSmithTracePreview,
  syncAndShareRunBundleToLangSmith,
} from '@/lib/observability/langsmith';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { loadRunBundle } from '@/lib/supabase/bundle';
import { createSupabaseAnonServerClient, createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;
  const supabase = await createSupabaseServerClient();
  let bundle = await loadRunBundle(supabase, runId);

  if (!bundle) {
    const anonClient = createSupabaseAnonServerClient();
    bundle = await loadRunBundle(anonClient, runId);
  }

  if (!bundle) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found.');
  }

  const preview = getInstantLangSmithTracePreview(bundle);

  return NextResponse.json({
    ok: true,
    langsmith: preview,
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;
  const rl = enforceRateLimit(`langsmith_sync:${runId}`, 20, 60_000);
  if (!rl.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'LangSmith sync rate limit exceeded.');
  }

  const supabase = await createSupabaseServerClient();
  let bundle = await loadRunBundle(supabase, runId);

  if (!bundle) {
    const anonClient = createSupabaseAnonServerClient();
    bundle = await loadRunBundle(anonClient, runId);
  }

  if (!bundle) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found.');
  }

  const result = await syncAndShareRunBundleToLangSmith(bundle);

  if (!bundle.run.is_demo && result.liveSynced) {
    await supabase
      .rpc('append_run_event', {
        p_run_id: runId,
        p_stage: 'verified',
        p_event_type: 'langsmith_trace_synced',
        p_summary: `Synced 5-span hierarchical trace & 4 online evaluator scores to LangSmith (${result.projectName})`,
        p_payload: {
          projectName: result.projectName,
          rootTraceId: result.rootTraceId,
          publicShareUrl: result.publicShareUrl,
        },
      })
      .then(() => null, () => null);
  }

  return NextResponse.json({
    ok: true,
    langsmith: result,
  });
}
