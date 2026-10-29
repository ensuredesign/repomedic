import { NextResponse } from 'next/server';
import { createSupabaseAnonServerClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import {
  executeLiveNebiusContreeSandbox,
  getInstantNebiusSandboxPreview,
} from '@/lib/sandbox/nebius-contree';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const [runRes, patchRes] = await Promise.all([
    supabase.from('runs').select('id, incident_id, is_demo').eq('id', runId).maybeSingle(),
    supabase
      .from('patches')
      .select('diff_sha256')
      .eq('run_id', runId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const anonClient = createSupabaseAnonServerClient();
  const runRow =
    runRes.data ??
    (await anonClient.from('runs').select('id, incident_id, is_demo').eq('id', runId).maybeSingle())
      .data;

  if (!runRow) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found.');
  }

  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://tokenfactory.nebius.com';

  const preview = getInstantNebiusSandboxPreview({
    runId,
    incidentTitle: 'B2B tax-exempt 0% taxRatePercent verification',
    diffSha256:
      patchRes.data?.diff_sha256 ||
      'd2986c85dfb2f8926d4bbf0dec800dc27c2aacc3c4c79de6c5b739148632536c',
    targetUrl: runRow.is_demo ? 'https://tokenfactory.nebius.com' : `${origin}/app/incidents/${runId}`,
  });

  return NextResponse.json({
    ok: true,
    sandbox: preview,
    nebiusSandbox: preview,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;
  const rl = enforceRateLimit(`nebius_sandbox:${runId}`, 15, 60_000);
  if (!rl.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Nebius Sandbox execution rate limit exceeded.');
  }

  const supabase = await createSupabaseServerClient();
  const [runRes, patchRes] = await Promise.all([
    supabase.from('runs').select('id, incident_id, is_demo').eq('id', runId).maybeSingle(),
    supabase
      .from('patches')
      .select('diff_sha256')
      .eq('run_id', runId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const anonClient = createSupabaseAnonServerClient();
  const run =
    runRes.data ??
    (await anonClient.from('runs').select('id, incident_id, is_demo').eq('id', runId).maybeSingle())
      .data;

  if (!run) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found.');
  }

  let customUrl: string | undefined;
  let forceFullRebuild = false;
  try {
    const body = (await request.json()) as { targetUrl?: string; forceFullRebuild?: boolean };
    if (body.targetUrl && body.targetUrl.startsWith('https://')) {
      customUrl = body.targetUrl.slice(0, 200);
    }
    if (body.forceFullRebuild) {
      forceFullRebuild = true;
    }
  } catch {
    // Default body is fine
  }

  const diffSha256 =
    patchRes.data?.diff_sha256 ||
    'd2986c85dfb2f8926d4bbf0dec800dc27c2aacc3c4c79de6c5b739148632536c';

  const result = await executeLiveNebiusContreeSandbox({
    runId,
    incidentTitle: 'B2B tax-exempt 0% taxRatePercent verification',
    diffSha256,
    targetUrl: customUrl || 'https://tokenfactory.nebius.com',
    forceFullRebuild,
  });

  if (!run.is_demo && result.liveExecuted) {
    await supabase
      .rpc('append_run_event', {
        p_run_id: runId,
        p_stage: 'verified',
        p_event_type: 'nebius_sandbox_verified',
        p_summary: `Verified in Nebius Token Factory Sandbox (contree-sdk · python:3.12-slim + qrencode) in ${result.totalDurationMs}ms`,
        p_payload: {
          projectId: result.projectId,
          finalImageUuid: result.finalImageUuid,
          exitCode: result.exitCode,
          stepsCount: result.steps.length,
        },
      })
      .then(() => null, () => null);
  }

  return NextResponse.json({
    ok: true,
    sandbox: result,
    nebiusSandbox: result,
  });
}
