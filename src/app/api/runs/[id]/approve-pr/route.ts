import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyUnifiedDiffToSlice } from '@/lib/agent/orchestrator';
import { sendProofOfFixNotificationEmail } from '@/lib/email/resend';
import {
  createApprovalGatedDraftPr,
  fetchPinnedRepositorySlice,
} from '@/lib/github/client';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { computeDiffSha256, redactSecrets } from '@/lib/security/redact';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { IncidentRow, PatchRow, RunRow, TestResultRow } from '@/lib/supabase/types';

const ApprovePrSchema = z.object({
  patchId: z.string().uuid(),
  approvedDiffSha256: z.string().length(64),
  confirmedHumanReview: z.literal(true),
  notifyEmail: z.string().email().max(240).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Authentication required to approve draft PR.');
  }

  const limit = enforceRateLimit(`approve-pr:${user.id}`, 6, 60_000);
  if (!limit.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'PR approval rate limit exceeded.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const parsed = ApprovePrSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      'Explicit human confirmation and exact 64-char SHA-256 diff hash are required.',
    );
  }

  const { data: runData, error: runErr } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .eq('user_id', user.id)
    .eq('is_demo', false)
    .single();

  if (runErr || !runData) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found or access denied.');
  }
  const run = runData as RunRow;

  // Idempotency: if a draft PR was already created for this run, return it immediately
  const { data: existingPr } = await supabase
    .from('pull_requests')
    .select('*')
    .eq('run_id', runId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingPr) {
    return NextResponse.json({
      pullRequest: existingPr,
      deduplicated: true,
    });
  }

  if (run.status !== 'verified' && run.status !== 'awaiting_approval') {
    return apiErrorResponse(
      409,
      'RUN_NOT_VERIFIED',
      `Cannot create draft PR for run in status "${run.status}". Only verified patches can be approved.`,
    );
  }

  const { data: patchData, error: patchErr } = await supabase
    .from('patches')
    .select('*')
    .eq('id', parsed.data.patchId)
    .eq('run_id', runId)
    .eq('user_id', user.id)
    .single();

  if (patchErr || !patchData) {
    return apiErrorResponse(404, 'PATCH_NOT_FOUND', 'Candidate patch not found for this run.');
  }
  const patch = patchData as PatchRow;

  const actualHash = computeDiffSha256(patch.unified_diff);
  if (
    actualHash !== patch.diff_sha256 ||
    parsed.data.approvedDiffSha256.toLowerCase() !== actualHash.toLowerCase()
  ) {
    return apiErrorResponse(
      409,
      'DIFF_HASH_MISMATCH',
      'Approved diff SHA-256 does not match the verified patch diff hash. Refusing GitHub write.',
    );
  }

  const { data: incidentData } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', run.incident_id)
    .eq('user_id', user.id)
    .single();
  const incident = incidentData as IncidentRow;

  // Record explicit human approval in public.approvals
  const { data: approvalRows, error: appErr } = await supabase
    .from('approvals')
    .upsert(
      {
        run_id: runId,
        user_id: user.id,
        approved_sha: incident.base_sha,
        approved_patch_id: patch.id,
        approved_diff_sha256: actualHash,
        action: 'create_draft_pr',
      },
      { onConflict: 'run_id,approved_patch_id' },
    )
    .select('*');

  if (appErr || !approvalRows || approvalRows.length === 0) {
    return apiErrorResponse(
      500,
      'APPROVAL_PERSIST_ERROR',
      appErr?.message || 'Failed to record human approval.',
    );
  }
  const approval = approvalRows[0];

  const { data: testRows } = await supabase
    .from('test_results')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });
  const tests = (testRows ?? []) as TestResultRow[];
  const baseline = tests.find((t) => t.kind === 'baseline');
  const candidate = tests.filter((t) => t.kind === 'candidate').pop();

  try {
    const slice = await fetchPinnedRepositorySlice({
      repositoryFullName: incident.repository_full_name,
      baseSha: incident.base_sha,
    });
    const modifiedFiles = applyUnifiedDiffToSlice(slice.files, patch.unified_diff);

    const createdPr = await createApprovalGatedDraftPr({
      repositoryFullName: incident.repository_full_name,
      baseSha: slice.pinnedSha,
      runId,
      incidentTitle: incident.title,
      rationale: patch.rationale,
      unifiedDiff: patch.unified_diff,
      modifiedFiles,
      touchedPaths: patch.touched_paths,
      baselineSummary: baseline
        ? `Command \`${baseline.command}\` exited with code ${baseline.exit_code} (${baseline.failed ?? '?'} failed, ${baseline.passed ?? '?'} passed in ${baseline.duration_ms}ms)`
        : 'Recorded failing baseline',
      candidateSummary: candidate
        ? `Command \`${candidate.command}\` exited with code ${candidate.exit_code} (${candidate.failed ?? 0} failed, ${candidate.passed ?? '?'} passed in ${candidate.duration_ms}ms)`
        : 'Recorded passing candidate',
    });

    const { data: savedPr, error: prInsertErr } = await supabase
      .from('pull_requests')
      .insert({
        run_id: runId,
        user_id: user.id,
        approval_id: approval.id,
        github_pr_number: createdPr.prNumber,
        github_pr_url: createdPr.prUrl,
        branch_name: createdPr.branchName,
        head_sha: createdPr.headSha,
        is_draft: true,
      })
      .select('*')
      .single();

    if (prInsertErr || !savedPr) {
      throw new Error(prInsertErr?.message || 'Failed to store PR record.');
    }

    await supabase
      .from('runs')
      .update({
        status: 'draft_pr_created',
        current_stage: 'draft_pr_created',
      })
      .eq('id', runId)
      .eq('user_id', user.id);

    await supabase.rpc('append_run_event', {
      p_run_id: runId,
      p_stage: 'draft_pr_created',
      p_event_type: 'draft_pr_opened',
      p_summary: `Created approval-gated draft PR #${createdPr.prNumber} on branch ${createdPr.branchName}.`,
      p_payload: {
        prNumber: createdPr.prNumber,
        prUrl: createdPr.prUrl,
        branchName: createdPr.branchName,
        approvedDiffSha256: actualHash,
      },
    });

    let emailNotification: { sent: boolean; emailId: string | null; toEmail: string } | null = null;
    if (parsed.data.notifyEmail) {
      const emailRes = await sendProofOfFixNotificationEmail({
        toEmail: parsed.data.notifyEmail,
        runId,
        incidentTitle: incident.title,
        repositoryFullName: incident.repository_full_name,
        baseSha: slice.pinnedSha,
        modelId: run.model_id,
        rootCause:
          run.diagnosis_json?.rootCause ||
          'Diagnosed failing code path and verified surgical fix in isolated sandbox.',
        rationale: patch.rationale,
        diffSha256: actualHash,
        unifiedDiff: patch.unified_diff,
        baselineSummary: baseline
          ? `${baseline.command} -> Exit ${baseline.exit_code} (${baseline.failed ?? '?'} failed, ${baseline.passed ?? '?'} passed)`
          : 'Baseline failure reproduced',
        candidateSummary: candidate
          ? `${candidate.command} -> Exit ${candidate.exit_code} (${candidate.failed ?? 0} failed, ${candidate.passed ?? '?'} passed)`
          : 'Candidate patch passed',
        draftPrUrl: createdPr.prUrl,
        draftPrNumber: createdPr.prNumber,
      });
      emailNotification = {
        sent: emailRes.sent,
        emailId: emailRes.emailId,
        toEmail: emailRes.toEmail,
      };
    }

    return NextResponse.json({
      approval,
      pullRequest: savedPr,
      deduplicated: false,
      emailNotification,
    });
  } catch (err) {
    const cleanMsg = redactSecrets(err instanceof Error ? err.message : String(err), 400);
    await supabase.rpc('append_run_event', {
      p_run_id: runId,
      p_stage: 'awaiting_approval',
      p_event_type: 'draft_pr_blocked',
      p_summary: `Human approval recorded (sha256:${actualHash.slice(0, 12)}), but GitHub draft PR write was blocked: ${cleanMsg}`,
      p_payload: {
        approvalId: approval.id,
        approvedDiffSha256: actualHash,
        error: cleanMsg,
      },
    });

    return apiErrorResponse(502, 'GITHUB_PR_BLOCKED', cleanMsg);
  }
}
