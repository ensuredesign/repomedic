import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNebiusConfig } from '@/lib/ai/nebius';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';

const CreateRunSchema = z.object({
  incidentId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(6).max(120).optional(),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Authentication required to start a run.');
  }

  const limit = enforceRateLimit(`runs:${user.id}`, 10, 60_000);
  if (!limit.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Run creation rate limit exceeded.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const parsed = CreateRunSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  // Verify incident belongs to user
  const { data: incident, error: incErr } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', parsed.data.incidentId)
    .eq('user_id', user.id)
    .eq('is_demo', false)
    .single();

  if (incErr || !incident) {
    return apiErrorResponse(404, 'INCIDENT_NOT_FOUND', 'Incident not found or access denied.');
  }

  // Idempotency check if idempotencyKey provided
  if (parsed.data.idempotencyKey) {
    const { data: existingIdempotent } = await supabase
      .from('runs')
      .select('*')
      .eq('user_id', user.id)
      .eq('idempotency_key', parsed.data.idempotencyKey)
      .limit(1);

    if (existingIdempotent && existingIdempotent.length > 0) {
      return NextResponse.json({ run: existingIdempotent[0], deduplicated: true });
    }
  }

  // Enforce 1 concurrent active run per user (PRD Section 14)
  const { data: activeRuns } = await supabase
    .from('runs')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('is_demo', false)
    .in('status', [
      'queued',
      'fetching',
      'baseline_running',
      'investigating',
      'patch_generating',
      'patch_testing',
      'refining',
    ]);

  if (activeRuns && activeRuns.length > 0) {
    return apiErrorResponse(
      409,
      'CONCURRENT_RUN_LIMIT',
      `You already have an active investigation run (${activeRuns[0].id}). Wait for it to finish or advance it before starting another.`,
    );
  }

  const nebiusCfg = getNebiusConfig();
  const { data: run, error: runErr } = await supabase
    .from('runs')
    .insert({
      incident_id: incident.id,
      user_id: user.id,
      status: 'fetching',
      current_stage: 'fetching',
      attempt_count: 0,
      model_id: nebiusCfg.configuredModel,
      idempotency_key: parsed.data.idempotencyKey || null,
      is_demo: false,
    })
    .select('*')
    .single();

  if (runErr || !run) {
    return apiErrorResponse(500, 'DB_INSERT_ERROR', runErr?.message || 'Failed to create run.');
  }

  await supabase.rpc('append_run_event', {
    p_run_id: run.id,
    p_stage: 'queued',
    p_event_type: 'run_created',
    p_summary: `Initialized autonomous investigation run for ${incident.repository_full_name} @ ${incident.base_sha.slice(0, 12)}.`,
    p_payload: {
      incidentId: incident.id,
      modelId: nebiusCfg.configuredModel,
    },
  });

  return NextResponse.json({ run }, { status: 201 });
}
