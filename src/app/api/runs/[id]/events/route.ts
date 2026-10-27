import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/security/api-guard';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const afterSeq = Number.parseInt(url.searchParams.get('after') || '0', 10) || 0;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: run, error: runErr } = await supabase
    .from('runs')
    .select('id, user_id, status, current_stage, is_demo')
    .eq('id', id)
    .single();

  if (runErr || !run) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found or access denied.');
  }

  if (!run.is_demo && (!user || run.user_id !== user.id)) {
    return apiErrorResponse(403, 'FORBIDDEN', 'Access denied.');
  }

  const { data: events, error: evErr } = await supabase
    .from('run_events')
    .select('*')
    .eq('run_id', id)
    .gt('seq', afterSeq)
    .order('seq', { ascending: true });

  if (evErr) {
    return apiErrorResponse(500, 'DB_ERROR', evErr.message);
  }

  return NextResponse.json({
    runId: run.id,
    status: run.status,
    currentStage: run.current_stage,
    events: events ?? [],
  });
}
