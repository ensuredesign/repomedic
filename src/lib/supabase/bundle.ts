import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApprovalRow,
  CompleteRunBundle,
  IncidentRow,
  PatchRow,
  PullRequestRow,
  RunEventRow,
  RunRow,
  TestResultRow,
} from '@/lib/supabase/types';

export async function loadRunBundle(
  supabase: SupabaseClient,
  runId: string,
): Promise<CompleteRunBundle | null> {
  const { data: runData, error: runErr } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle();

  if (runErr || !runData) {
    return null;
  }

  const run = runData as RunRow;

  const [
    incidentRes,
    eventsRes,
    patchesRes,
    testsRes,
    approvalsRes,
    prRes,
  ] = await Promise.all([
    supabase.from('incidents').select('*').eq('id', run.incident_id).maybeSingle(),
    supabase
      .from('run_events')
      .select('*')
      .eq('run_id', run.id)
      .order('seq', { ascending: true }),
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
    supabase
      .from('approvals')
      .select('*')
      .eq('run_id', run.id)
      .order('approved_at', { ascending: false }),
    supabase
      .from('pull_requests')
      .select('*')
      .eq('run_id', run.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!incidentRes.data) {
    return null;
  }

  return {
    incident: incidentRes.data as IncidentRow,
    run,
    events: (eventsRes.data ?? []) as RunEventRow[],
    patches: (patchesRes.data ?? []) as PatchRow[],
    testResults: (testsRes.data ?? []) as TestResultRow[],
    approvals: (approvalsRes.data ?? []) as ApprovalRow[],
    pullRequest: (prRes.data as PullRequestRow | null) ?? null,
  };
}
