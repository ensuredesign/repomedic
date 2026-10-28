import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendProofOfFixNotificationEmail } from '@/lib/email/resend';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  IncidentRow,
  PatchRow,
  PullRequestRow,
  RunRow,
  TestResultRow,
} from '@/lib/supabase/types';

const NotifySchema = z.object({
  recipientEmail: z.string().email().max(240).optional(),
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
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Sign in required to send email reports.');
  }

  const limit = enforceRateLimit(`notify-email:${user.id}`, 8, 60_000);
  if (!limit.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Email notification rate limit exceeded.');
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = NotifySchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(400, 'VALIDATION_ERROR', 'Provide a valid email address.');
  }

  const toEmail = parsed.data.recipientEmail?.trim() || user.email;
  if (!toEmail) {
    return apiErrorResponse(400, 'MISSING_EMAIL', 'Recipient email address is required.');
  }

  const { data: runData, error: runErr } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (runErr || !runData) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found or access denied.');
  }
  const run = runData as RunRow;

  const { data: incidentData } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', run.incident_id)
    .single();
  const incident = incidentData as IncidentRow;

  const { data: patchRows } = await supabase
    .from('patches')
    .select('*')
    .eq('run_id', runId)
    .order('attempt_number', { ascending: false })
    .limit(1);
  const latestPatch = (patchRows as PatchRow[] | null)?.[0];

  if (!latestPatch) {
    return apiErrorResponse(
      409,
      'PATCH_NOT_READY',
      'Cannot send Proof-of-Fix email before a candidate patch has been generated.',
    );
  }

  const { data: testRows } = await supabase
    .from('test_results')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });
  const tests = (testRows ?? []) as TestResultRow[];
  const baseline = tests.find((t) => t.kind === 'baseline');
  const candidate = tests.filter((t) => t.kind === 'candidate').pop();

  const { data: prData } = await supabase
    .from('pull_requests')
    .select('*')
    .eq('run_id', runId)
    .maybeSingle();
  const pullRequest = (prData as PullRequestRow | null) ?? null;

  const emailRes = await sendProofOfFixNotificationEmail({
    toEmail,
    runId: run.id,
    incidentTitle: incident.title,
    repositoryFullName: incident.repository_full_name,
    baseSha: incident.base_sha,
    modelId: run.model_id,
    rootCause:
      run.diagnosis_json?.rootCause ||
      'Diagnosed failing code path and verified surgical fix in isolated sandbox.',
    rationale: latestPatch.rationale,
    diffSha256: latestPatch.diff_sha256,
    unifiedDiff: latestPatch.unified_diff,
    baselineSummary: baseline
      ? `${baseline.command} -> Exit ${baseline.exit_code} (${baseline.failed ?? '?'} failed, ${baseline.passed ?? '?'} passed)`
      : 'Baseline failure reproduced',
    candidateSummary: candidate
      ? `${candidate.command} -> Exit ${candidate.exit_code} (${candidate.failed ?? 0} failed, ${candidate.passed ?? '?'} passed)`
      : 'Candidate patch passed',
    draftPrUrl: pullRequest?.github_pr_url ?? null,
    draftPrNumber: pullRequest?.github_pr_number ?? null,
  });

  if (!emailRes.sent) {
    return apiErrorResponse(
      502,
      'RESEND_DELIVERY_FAILED',
      emailRes.error || 'Failed to send Proof-of-Fix email via Resend.',
    );
  }

  if (!run.is_demo && run.user_id === user.id) {
    await supabase.rpc('append_run_event', {
      p_run_id: run.id,
      p_stage: run.current_stage,
      p_event_type: 'email_notification_sent',
      p_summary: `Sent Proof-of-Fix email report via Resend (${emailRes.fromEmail}) to ${toEmail}.`,
      p_payload: {
        emailId: emailRes.emailId,
        toEmail,
      },
    });
  }

  return NextResponse.json({
    sent: true,
    emailId: emailRes.emailId,
    fromEmail: emailRes.fromEmail,
    toEmail: emailRes.toEmail,
  });
}
