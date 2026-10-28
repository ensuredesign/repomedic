import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/security/api-guard';
import { analyzePatchSecurityAndBlastRadius } from '@/lib/security/patch-scanner';
import type {
  ApprovalRow,
  IncidentRow,
  PatchRow,
  PullRequestRow,
  RunRow,
  TestResultRow,
} from '@/lib/supabase/types';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: runData, error: runErr } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (runErr || !runData) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found or access denied.');
  }
  const run = runData as RunRow;

  if (!run.is_demo) {
    if (!user) {
      return apiErrorResponse(403, 'FORBIDDEN', 'Authentication required to export attestation.');
    }
    if (run.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.role !== 'admin') {
        return apiErrorResponse(403, 'FORBIDDEN', 'Access denied.');
      }
    }
  }

  const [incidentRes, patchesRes, testsRes, approvalsRes, prRes] = await Promise.all([
    supabase.from('incidents').select('*').eq('id', run.incident_id).single(),
    supabase
      .from('patches')
      .select('*')
      .eq('run_id', run.id)
      .order('attempt_number', { ascending: false })
      .limit(1),
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

  const incident = incidentRes.data as IncidentRow;
  const latestPatch = ((patchesRes.data ?? []) as PatchRow[])[0] ?? null;
  const tests = (testsRes.data ?? []) as TestResultRow[];
  const baseline = tests.find((t) => t.kind === 'baseline') ?? null;
  const candidate = tests.filter((t) => t.kind === 'candidate').pop() ?? null;
  const approvals = (approvalsRes.data ?? []) as ApprovalRow[];
  const pullRequest = (prRes.data as PullRequestRow | null) ?? null;

  const securityAudit = latestPatch
    ? analyzePatchSecurityAndBlastRadius({
        unifiedDiff: latestPatch.unified_diff,
        expectedDiffSha256: latestPatch.diff_sha256,
        touchedPaths: latestPatch.touched_paths,
      })
    : null;

  const attestationCore = {
    schemaVersion: 'repomedic.attestation.v1',
    generatedAt: new Date().toISOString(),
    provenance: run.is_demo ? 'recorded_case_study' : 'live_autonomous_execution',
    incident: {
      id: incident.id,
      title: incident.title,
      repositoryFullName: incident.repository_full_name,
      pinnedBaseSha: incident.base_sha,
    },
    aiDiagnosis: {
      provider: 'Nebius Token Factory',
      modelId: run.model_id,
      inputTokens: run.input_tokens,
      outputTokens: run.output_tokens,
      estimatedCostUsd: run.estimated_cost_usd,
      confidenceLabel: run.diagnosis_json?.confidenceLabel ?? null,
      rootCause: run.diagnosis_json?.rootCause ?? null,
      evidencePaths: run.diagnosis_json?.evidencePaths ?? [],
    },
    sandboxVerification: {
      runner: run.runner_id || 'vercel-sandbox',
      status: run.status,
      attemptCount: run.attempt_count,
      baseline: baseline
        ? {
            command: baseline.command,
            exitCode: baseline.exit_code,
            passed: baseline.passed,
            failed: baseline.failed,
            durationMs: baseline.duration_ms,
          }
        : null,
      candidate: candidate
        ? {
            command: candidate.command,
            exitCode: candidate.exit_code,
            passed: candidate.passed,
            failed: candidate.failed,
            durationMs: candidate.duration_ms,
          }
        : null,
    },
    patchArtifact: latestPatch
      ? {
          patchId: latestPatch.id,
          attemptNumber: latestPatch.attempt_number,
          diffSha256: latestPatch.diff_sha256,
          touchedPaths: latestPatch.touched_paths,
          rationale: latestPatch.rationale,
          securityAudit,
        }
      : null,
    governance: {
      humanApprovalRecorded: approvals.length > 0,
      approvedDiffSha256: approvals[0]?.approved_diff_sha256 ?? null,
      approvedAt: approvals[0]?.approved_at ?? null,
      draftPullRequest: pullRequest
        ? {
            prNumber: pullRequest.github_pr_number,
            prUrl: pullRequest.github_pr_url,
            branchName: pullRequest.branch_name,
            headSha: pullRequest.head_sha,
            isDraft: pullRequest.is_draft,
          }
        : null,
    },
  };

  const canonicalJson = JSON.stringify(attestationCore);
  const attestationSha256 = createHash('sha256').update(canonicalJson, 'utf8').digest('hex');

  return NextResponse.json({
    ...attestationCore,
    attestationSha256,
  });
}
