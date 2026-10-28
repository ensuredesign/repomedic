import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { advanceRunStage, applyUnifiedDiffToSlice } from '@/lib/agent/orchestrator';
import {
  createApprovalGatedDraftPr,
  fetchPinnedRepositorySlice,
} from '@/lib/github/client';
import { computeDiffSha256 } from '@/lib/security/redact';
import { supabaseFetchWithRetry } from '@/lib/supabase/client';
import type { PatchRow, RunRow, TestResultRow } from '@/lib/supabase/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const FIXTURE_REPO = 'ensuredesign/repomedic-fixture';
const FIXTURE_SHA = '440255c3e1efe73a24d2cd92b90055c54c3e3549';

describe('M2 & M4 Gate — 3 Consecutive Live End-to-End Closed-Loop Runs + Approval-Gated GitHub Draft PR', () => {
  it(
    'executes 3 consecutive live runs (GitHub -> Vercel Sandbox Baseline Red -> Nebius Nemotron -> Patched Green) and creates an idempotent Draft PR',
    async () => {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { fetch: supabaseFetchWithRetry },
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const email = 'judge@repomedic.dev';
      const password = 'RepoMedicJudge!2026';

      // Sign in or sign up judge account
      const initialSignIn = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      let user = initialSignIn.data.user;
      if (initialSignIn.error || !user) {
        const signUpRes = await supabase.auth.signUp({ email, password });
        expect(signUpRes.error).toBeNull();
        if (!signUpRes.data.session) {
          const retrySignIn = await supabase.auth.signInWithPassword({ email, password });
          user = retrySignIn.data.user;
        } else {
          user = signUpRes.data.user;
        }
      }

      expect(user).toBeTruthy();
      const verifiedUser = user!;

      // Remove any previous failed/incomplete test incidents before starting the 3 consecutive runs
      const { data: oldRuns } = await supabase
        .from('runs')
        .select('incident_id, status')
        .eq('user_id', verifiedUser.id)
        .neq('status', 'draft_pr_created');
      for (const r of oldRuns ?? []) {
        await supabase.from('incidents').delete().eq('id', r.incident_id);
      }

      const completedRunSummaries: Array<{
        runNumber: number;
        runId: string;
        status: string;
        attemptCount: number;
        modelId: string;
        inputTokens: number;
        outputTokens: number;
        baselineExitCode: number;
        candidateExitCode: number;
        diffSha256: string;
        prUrl?: string;
      }> = [];

      for (let runIdx = 1; runIdx <= 3; runIdx++) {
        console.log(`\n=== STARTING LIVE END-TO-END RUN #${runIdx} ===`);

        const { data: incident, error: incErr } = await supabase
          .from('incidents')
          .insert({
            user_id: verifiedUser.id,
            repository_full_name: FIXTURE_REPO,
            base_sha: FIXTURE_SHA,
            title: `Live Verification Run #${runIdx}: B2B 0% taxRatePercent charged 8.5% default tax`,
            affected_file_hint: 'src/pricing.ts',
            error_text_redacted: [
              'FAIL fixtures/buggy-order-service/tests/pricing.test.ts > calculateOrderInvoice > 5. honors explicit 0% tax rate for tax-exempt B2B orders',
              'AssertionError: expected 8.5 to be +0 // Object.is equality',
              '  - Expected: 0',
              '  + Received: 8.5',
              ' ❯ fixtures/buggy-order-service/tests/pricing.test.ts:63:36',
            ].join('\n'),
            is_demo: false,
          })
          .select('*')
          .single();

        expect(incErr).toBeNull();
        expect(incident).toBeTruthy();

        const { data: createdRun, error: runErr } = await supabase
          .from('runs')
          .insert({
            incident_id: incident.id,
            user_id: verifiedUser.id,
            status: 'fetching',
            current_stage: 'fetching',
            attempt_count: 0,
            model_id: 'nvidia/nemotron-3-super-120b-a12b',
            idempotency_key: `e2e-live-run-${Date.now()}-${runIdx}`,
            is_demo: false,
          })
          .select('*')
          .single();

        expect(runErr).toBeNull();
        let currentRun = createdRun as RunRow;

        await supabase.rpc('append_run_event', {
          p_run_id: currentRun.id,
          p_stage: 'queued',
          p_event_type: 'run_created',
          p_summary: `Initialized live end-to-end verification run #${runIdx} for ${FIXTURE_REPO}@${FIXTURE_SHA.slice(0, 12)}.`,
          p_payload: { runIdx },
        });

        let stepGuard = 0;
        while (
          !['verified', 'unverified', 'failed', 'draft_pr_created'].includes(
            currentRun.status,
          ) &&
          stepGuard < 10
        ) {
          stepGuard += 1;
          console.log(
            `[Run #${runIdx}] Step ${stepGuard}: advancing from stage "${currentRun.status}"...`,
          );
          const stepRes = await advanceRunStage({
            supabase,
            runId: currentRun.id,
            userId: verifiedUser.id,
          });
          console.log(`[Run #${runIdx}] -> ${stepRes.run.status}: ${stepRes.message}`);
          currentRun = stepRes.run;
        }

        expect(currentRun.status).toBe('verified');

        const { data: testRows } = await supabase
          .from('test_results')
          .select('*')
          .eq('run_id', currentRun.id)
          .order('created_at', { ascending: true });
        const tests = (testRows ?? []) as TestResultRow[];
        const baseline = tests.find((t) => t.kind === 'baseline')!;
        const candidate = tests.filter((t) => t.kind === 'candidate').pop()!;

        expect(baseline.exit_code).not.toBe(0);
        expect(candidate.exit_code).toBe(0);

        const { data: patchRows } = await supabase
          .from('patches')
          .select('*')
          .eq('run_id', currentRun.id)
          .order('attempt_number', { ascending: false })
          .limit(1);
        const latestPatch = (patchRows as PatchRow[])[0]!;
        expect(latestPatch).toBeTruthy();

        let prUrl: string | undefined;

        // On Run #1, also execute the explicit SHA-256 human approval gate & idempotent GitHub Draft PR creation!
        if (runIdx === 1) {
          const verifiedHash = computeDiffSha256(latestPatch.unified_diff);
          expect(verifiedHash).toBe(latestPatch.diff_sha256);

          const { data: approvalRows, error: appErr } = await supabase
            .from('approvals')
            .upsert(
              {
                run_id: currentRun.id,
                user_id: verifiedUser.id,
                approved_sha: FIXTURE_SHA,
                approved_patch_id: latestPatch.id,
                approved_diff_sha256: verifiedHash,
                action: 'create_draft_pr',
              },
              { onConflict: 'run_id,approved_patch_id' },
            )
            .select('*');

          expect(appErr).toBeNull();
          const approval = approvalRows![0];

          const slice = await fetchPinnedRepositorySlice({
            repositoryFullName: FIXTURE_REPO,
            baseSha: FIXTURE_SHA,
          });
          const modifiedFiles = applyUnifiedDiffToSlice(
            slice.files,
            latestPatch.unified_diff,
          );

          const prAttempt1 = await createApprovalGatedDraftPr({
            repositoryFullName: FIXTURE_REPO,
            baseSha: FIXTURE_SHA,
            runId: currentRun.id,
            incidentTitle: incident.title,
            rationale: latestPatch.rationale,
            unifiedDiff: latestPatch.unified_diff,
            modifiedFiles,
            touchedPaths: latestPatch.touched_paths,
            baselineSummary: `Command \`${baseline.command}\` exited with code ${baseline.exit_code} (${baseline.failed} failed, ${baseline.passed} passed in ${baseline.duration_ms}ms)`,
            candidateSummary: `Command \`${candidate.command}\` exited with code ${candidate.exit_code} (${candidate.failed} failed, ${candidate.passed} passed in ${candidate.duration_ms}ms)`,
          });

          // Audit test (PRD Section 14): second PR approval retry produces the exact same draft PR (1 maximum)
          const prAttempt2 = await createApprovalGatedDraftPr({
            repositoryFullName: FIXTURE_REPO,
            baseSha: FIXTURE_SHA,
            runId: currentRun.id,
            incidentTitle: incident.title,
            rationale: latestPatch.rationale,
            unifiedDiff: latestPatch.unified_diff,
            modifiedFiles,
            touchedPaths: latestPatch.touched_paths,
            baselineSummary: 'Retry check',
            candidateSummary: 'Retry check',
          });

          expect(prAttempt2.prNumber).toBe(prAttempt1.prNumber);
          expect(prAttempt2.prUrl).toBe(prAttempt1.prUrl);

          const { error: prSaveErr } = await supabase.from('pull_requests').insert({
            run_id: currentRun.id,
            user_id: verifiedUser.id,
            approval_id: approval.id,
            github_pr_number: prAttempt1.prNumber,
            github_pr_url: prAttempt1.prUrl,
            branch_name: prAttempt1.branchName,
            head_sha: prAttempt1.headSha,
            is_draft: true,
          });
          expect(prSaveErr).toBeNull();

          await supabase
            .from('runs')
            .update({
              status: 'draft_pr_created',
              current_stage: 'draft_pr_created',
            })
            .eq('id', currentRun.id)
            .eq('user_id', verifiedUser.id);

          prUrl = prAttempt1.prUrl;
          console.log(`[Run #1] Created & Verified Idempotent Draft PR: ${prUrl}`);
        }

        completedRunSummaries.push({
          runNumber: runIdx,
          runId: currentRun.id,
          status: currentRun.status,
          attemptCount: currentRun.attempt_count,
          modelId: currentRun.model_id,
          inputTokens: currentRun.input_tokens,
          outputTokens: currentRun.output_tokens,
          baselineExitCode: baseline.exit_code,
          candidateExitCode: candidate.exit_code,
          diffSha256: latestPatch.diff_sha256,
          prUrl,
        });
      }

      console.log(
        '\n=== 3 CONSECUTIVE END-TO-END RUNS SUMMARY ===\n',
        JSON.stringify(completedRunSummaries, null, 2),
      );
      expect(completedRunSummaries).toHaveLength(3);
    },
    360_000,
  );
});
