import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/security/api-guard';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: run, error: runErr } = await supabase
    .from('runs')
    .select('*')
    .eq('id', id)
    .single();

  if (runErr || !run) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found or access denied.');
  }

  if (!run.is_demo) {
    if (!user) {
      return apiErrorResponse(403, 'FORBIDDEN', 'You do not have permission to view this run.');
    }
    if (run.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.role !== 'admin') {
        return apiErrorResponse(403, 'FORBIDDEN', 'You do not have permission to view this run.');
      }
    }
  }

  const [incidentRes, eventsRes, patchesRes, testsRes, approvalsRes, prRes] =
    await Promise.all([
      supabase.from('incidents').select('*').eq('id', run.incident_id).single(),
      supabase.from('run_events').select('*').eq('run_id', run.id).order('seq', { ascending: true }),
      supabase
        .from('patches')
        .select('*')
        .eq('run_id', run.id)
        .order('attempt_number', { ascending: true }),
      supabase
        .from('test_results')
        .select('*')
        .eq('run_id', run.id)
        .order('created_at', { ascending: true }),
      user && !run.is_demo
        ? supabase.from('approvals').select('*').eq('run_id', run.id)
        : Promise.resolve({ data: [] }),
      user && !run.is_demo
        ? supabase.from('pull_requests').select('*').eq('run_id', run.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  return NextResponse.json({
    bundle: {
      incident: incidentRes.data,
      run,
      events: eventsRes.data ?? [],
      patches: patchesRes.data ?? [],
      testResults: testsRes.data ?? [],
      approvals: approvalsRes.data ?? [],
      pullRequest: prRes.data ?? null,
    },
  });
}
