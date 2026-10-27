import { NextResponse } from 'next/server';
import { createSupabaseAnonServerClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/security/api-guard';

export async function GET() {
  const supabase = createSupabaseAnonServerClient();

  const { data: incidents, error: incErr } = await supabase
    .from('incidents')
    .select('*')
    .eq('is_demo', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (incErr || !incidents || incidents.length === 0) {
    return apiErrorResponse(404, 'DEMO_NOT_FOUND', 'Recorded demo case study not found.');
  }

  const incident = incidents[0];
  const { data: runs, error: runErr } = await supabase
    .from('runs')
    .select('*')
    .eq('incident_id', incident.id)
    .eq('is_demo', true)
    .limit(1);

  if (runErr || !runs || runs.length === 0) {
    return apiErrorResponse(404, 'DEMO_RUN_NOT_FOUND', 'Recorded demo run not found.');
  }

  const run = runs[0];
  const [eventsRes, patchesRes, testsRes] = await Promise.all([
    supabase
      .from('run_events')
      .select('*')
      .eq('run_id', run.id)
      .eq('is_demo', true)
      .order('seq', { ascending: true }),
    supabase
      .from('patches')
      .select('*')
      .eq('run_id', run.id)
      .eq('is_demo', true)
      .order('attempt_number', { ascending: true }),
    supabase
      .from('test_results')
      .select('*')
      .eq('run_id', run.id)
      .eq('is_demo', true)
      .order('created_at', { ascending: true }),
  ]);

  return NextResponse.json({
    provenance: 'recorded_case_study',
    disclaimer:
      'This is a curated read-only recorded case study persisted with is_demo=true for instant judge inspection. Sign in to run a live investigation.',
    bundle: {
      incident,
      run,
      events: eventsRes.data ?? [],
      patches: patchesRes.data ?? [],
      testResults: testsRes.data ?? [],
      approvals: [],
      pullRequest: null,
    },
  });
}
