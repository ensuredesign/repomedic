import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  diagnoseIncidentWithNemotron,
  generatePatchWithNemotron,
} from '@/lib/ai/nebius';
import {
  applyStructuredEdits,
  evaluateTestOutcome,
} from '@/lib/agent/patch-applier';
import { recallRepositoryEpisodicMemory } from '@/lib/agent/memory';
import { fetchPinnedRepositorySlice } from '@/lib/github/client';
import { runTestsInVercelSandbox } from '@/lib/sandbox/runner';
import { redactSecrets } from '@/lib/security/redact';
import type {
  IncidentRow,
  PatchRow,
  RunRow,
  TestResultRow,
} from '@/lib/supabase/types';

export const MAX_PATCH_ATTEMPTS = 2;

export async function advanceRunStage(params: {
  supabase: SupabaseClient;
  runId: string;
  userId: string;
}): Promise<{ run: RunRow; advanced: boolean; message: string }> {
  const { supabase, runId, userId } = params;
  const claimToken = randomUUID();

  // Atomically claim the run stage lock so concurrent tabs/requests cannot double-execute
  const { data: claimedRows, error: claimErr } = await supabase.rpc('claim_run_stage', {
    p_run_id: runId,
    p_claim_token: claimToken,
    p_lease_seconds: 120,
  });

  if (claimErr) {
    throw new Error(`Failed to claim run lock: ${claimErr.message}`);
  }

  const claimedRun = (claimedRows as RunRow[] | null)?.[0] ?? null;
  if (!claimedRun) {
    const { data: existingRun, error: fetchErr } = await supabase
      .from('runs')
      .select('*')
      .eq('id', runId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !existingRun) {
      throw new Error('Run not found or access denied.');
    }

    return {
      run: existingRun as RunRow,
      advanced: false,
      message: 'Run is already terminal or currently claimed by an active worker.',
    };
  }

  try {
    const { data: incidentData, error: incErr } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', claimedRun.incident_id)
      .eq('user_id', userId)
      .single();

    if (incErr || !incidentData) {
      throw new Error('Associated incident record not found.');
    }
    const incident = incidentData as IncidentRow;

    switch (claimedRun.status) {
      case 'queued':
      case 'fetching': {
        const slice = await fetchPinnedRepositorySlice({
          repositoryFullName: incident.repository_full_name,
          baseSha: incident.base_sha,
        });

        await supabase.rpc('append_run_event', {
          p_run_id: runId,
          p_stage: 'fetching',
          p_event_type: 'repo_fetched',
          p_summary: `Fetched ${slice.files.length} allowlisted files at pinned SHA ${slice.pinnedSha.slice(0, 12)} (${slice.source}).`,
          p_payload: {
            pinnedSha: slice.pinnedSha,
            source: slice.source,
            files: slice.files.map((f) => f.path),
          },
        });

        const { data: updated, error: updErr } = await supabase
          .from('runs')
          .update({
            status: 'baseline_running',
            current_stage: 'baseline_running',
          })
          .eq('id', runId)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (updErr || !updated) throw new Error(updErr?.message || 'Failed to update run stage');
        return {
          run: updated as RunRow,
          advanced: true,
          message: 'Repository snapshot fetched; ready for isolated baseline test.',
        };
      }

      case 'baseline_running': {
        const slice = await fetchPinnedRepositorySlice({
          repositoryFullName: incident.repository_full_name,
          baseSha: incident.base_sha,
        });

        const baselineResult = await runTestsInVercelSandbox({
          files: slice.files,
        });

        await supabase.from('test_results').insert({
          run_id: runId,
          user_id: userId,
          patch_id: null,
          kind: 'baseline',
          command: baselineResult.command,
          exit_code: baselineResult.exitCode,
          passed: baselineResult.passed,
          failed: baselineResult.failed,
          duration_ms: baselineResult.durationMs,
          stdout_excerpt: baselineResult.stdoutExcerpt,
          stderr_excerpt: baselineResult.stderrExcerpt,
          is_demo: false,
        });

        if (baselineResult.exitCode === 0) {
          await supabase.rpc('append_run_event', {
            p_run_id: runId,
            p_stage: 'baseline_running',
            p_event_type: 'baseline_inconclusive',
            p_summary:
              'Baseline test suite exited with code 0 (no failing tests reproduced). Marking run unverified.',
            p_payload: {
              exitCode: 0,
              durationMs: baselineResult.durationMs,
            },
          });

          const { data: updated } = await supabase
            .from('runs')
            .update({
              status: 'unverified',
              current_stage: 'unverified',
              finished_at: new Date().toISOString(),
              last_error:
                'Inconclusive baseline: unmodified commit passed all tests, so the reported failure was not reproduced.',
            })
            .eq('id', runId)
            .eq('user_id', userId)
            .select('*')
            .single();

          return {
            run: (updated ?? claimedRun) as RunRow,
            advanced: true,
            message: 'Baseline did not reproduce failure; marked unverified.',
          };
        }

        await supabase.rpc('append_run_event', {
          p_run_id: runId,
          p_stage: 'baseline_running',
          p_event_type: 'baseline_reproduced',
          p_summary: `Baseline failure reproduced in Vercel Sandbox: exit code ${baselineResult.exitCode} (${
            baselineResult.failed ?? '?'
          } failed, ${baselineResult.passed ?? '?'} passed in ${baselineResult.durationMs}ms).`,
          p_payload: {
            exitCode: baselineResult.exitCode,
            passed: baselineResult.passed,
            failed: baselineResult.failed,
            durationMs: baselineResult.durationMs,
          },
        });

        const { data: updated, error: updErr } = await supabase
          .from('runs')
          .update({
            status: 'investigating',
            current_stage: 'investigating',
            runner_id: baselineResult.runnerId,
          })
          .eq('id', runId)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (updErr || !updated) throw new Error(updErr?.message || 'Failed to advance to investigating');
        return {
          run: updated as RunRow,
          advanced: true,
          message: 'Baseline failure reproduced; advancing to NVIDIA Nemotron root-cause analysis.',
        };
      }

      case 'investigating': {
        const slice = await fetchPinnedRepositorySlice({
          repositoryFullName: incident.repository_full_name,
          baseSha: incident.base_sha,
        });

        const memorySnapshot = await recallRepositoryEpisodicMemory({
          supabase,
          repositoryFullName: incident.repository_full_name,
          excludeRunId: runId,
        });

        await supabase.rpc('append_run_event', {
          p_run_id: runId,
          p_stage: 'investigating',
          p_event_type: 'memory_recalled',
          p_summary: `Recalled persistent episodic memory for ${incident.repository_full_name}: ${memorySnapshot.verifiedFixesCount} prior verified fixes, hotspot ${memorySnapshot.knownHotspotPaths[0]?.path ?? 'src/pricing.ts'}, and ${memorySnapshot.learnedInvariants.length} repository invariants injected into Nemotron context.`,
          p_payload: {
            totalPriorRuns: memorySnapshot.totalPriorRuns,
            verifiedFixesCount: memorySnapshot.verifiedFixesCount,
            knownHotspotPaths: memorySnapshot.knownHotspotPaths,
            learnedInvariantsCount: memorySnapshot.learnedInvariants.length,
          },
        });

        const { data: baselineRows } = await supabase
          .from('test_results')
          .select('*')
          .eq('run_id', runId)
          .eq('kind', 'baseline')
          .order('created_at', { ascending: false })
          .limit(1);

        const baseline = (baselineRows as TestResultRow[] | null)?.[0];

        const aiResult = await diagnoseIncidentWithNemotron({
          repositoryFullName: incident.repository_full_name,
          baseSha: slice.pinnedSha,
          errorText: incident.error_text_redacted,
          baselineStdout: baseline?.stdout_excerpt ?? '',
          baselineStderr: baseline?.stderr_excerpt ?? '',
          sourceFiles: slice.files,
          episodicMemoryBlock: memorySnapshot.nemotronContextBlock,
        });

        await supabase.rpc('append_run_event', {
          p_run_id: runId,
          p_stage: 'investigating',
          p_event_type: 'diagnosis_completed',
          p_summary: `NVIDIA Nemotron (${aiResult.modelId}) diagnosed root cause [${aiResult.data.confidenceLabel}]: ${aiResult.data.rootCause.slice(0, 220)}`,
          p_payload: {
            modelId: aiResult.modelId,
            requestId: aiResult.requestId,
            latencyMs: aiResult.latencyMs,
            confidenceLabel: aiResult.data.confidenceLabel,
            evidencePaths: aiResult.data.evidencePaths,
          },
        });

        const { data: updated, error: updErr } = await supabase
          .from('runs')
          .update({
            status: 'patch_generating',
            current_stage: 'patch_generating',
            model_id: aiResult.modelId,
            input_tokens: claimedRun.input_tokens + aiResult.inputTokens,
            output_tokens: claimedRun.output_tokens + aiResult.outputTokens,
            diagnosis_json: {
              provenance: 'live_nemotron',
              ...aiResult.data,
              requestId: aiResult.requestId,
            },
          })
          .eq('id', runId)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (updErr || !updated) throw new Error(updErr?.message || 'Failed to save diagnosis');
        return {
          run: updated as RunRow,
          advanced: true,
          message: 'Nemotron root-cause diagnosis persisted; advancing to patch generation.',
        };
      }

      case 'patch_generating':
      case 'refining': {
        const nextAttempt = claimedRun.attempt_count + 1;
        if (nextAttempt > MAX_PATCH_ATTEMPTS) {
          const { data: unv } = await supabase
            .from('runs')
            .update({
              status: 'unverified',
              current_stage: 'unverified',
              finished_at: new Date().toISOString(),
              last_error: `Maximum patch attempts (${MAX_PATCH_ATTEMPTS}) reached without passing verification.`,
            })
            .eq('id', runId)
            .eq('user_id', userId)
            .select('*')
            .single();

          return {
            run: (unv ?? claimedRun) as RunRow,
            advanced: true,
            message: 'Maximum repair attempts exhausted; run marked unverified.',
          };
        }

        if (!claimedRun.diagnosis_json) {
          throw new Error('Cannot generate patch before structured diagnosis is recorded.');
        }

        const slice = await fetchPinnedRepositorySlice({
          repositoryFullName: incident.repository_full_name,
          baseSha: incident.base_sha,
        });

        let previousAttemptFeedback:
          | {
              attemptNumber: number;
              previousDiff: string;
              testStdout: string;
              testStderr: string;
            }
          | undefined;

        if (nextAttempt > 1) {
          const { data: prevPatches } = await supabase
            .from('patches')
            .select('*')
            .eq('run_id', runId)
            .order('attempt_number', { ascending: false })
            .limit(1);
          const { data: prevTests } = await supabase
            .from('test_results')
            .select('*')
            .eq('run_id', runId)
            .eq('kind', 'candidate')
            .order('created_at', { ascending: false })
            .limit(1);

          const prevPatch = (prevPatches as PatchRow[] | null)?.[0];
          const prevTest = (prevTests as TestResultRow[] | null)?.[0];
          if (prevPatch && prevTest) {
            previousAttemptFeedback = {
              attemptNumber: prevPatch.attempt_number,
              previousDiff: prevPatch.unified_diff,
              testStdout: prevTest.stdout_excerpt,
              testStderr: prevTest.stderr_excerpt,
            };
          }
        }

        const memorySnapshot = await recallRepositoryEpisodicMemory({
          supabase,
          repositoryFullName: incident.repository_full_name,
          excludeRunId: runId,
        });

        const patchCall = await generatePatchWithNemotron({
          repositoryFullName: incident.repository_full_name,
          baseSha: slice.pinnedSha,
          diagnosis: claimedRun.diagnosis_json,
          sourceFiles: slice.files,
          episodicMemoryBlock: memorySnapshot.nemotronContextBlock,
          previousAttemptFeedback,
        });

        const applied = applyStructuredEdits(slice.files, patchCall.data.edits);

        await supabase.from('patches').insert({
          run_id: runId,
          user_id: userId,
          attempt_number: nextAttempt,
          unified_diff: applied.unifiedDiff,
          diff_sha256: applied.diffSha256,
          touched_paths: applied.touchedPaths,
          rationale: patchCall.data.rationale,
          risk_notes: patchCall.data.riskNotes,
          is_demo: false,
        });

        await supabase.rpc('append_run_event', {
          p_run_id: runId,
          p_stage: 'patch_generating',
          p_event_type: 'patch_proposed',
          p_summary: `Proposed minimal candidate patch (attempt ${nextAttempt}/${MAX_PATCH_ATTEMPTS}) touching ${applied.touchedPaths.join(', ')} [sha256:${applied.diffSha256.slice(0, 12)}].`,
          p_payload: {
            attemptNumber: nextAttempt,
            touchedPaths: applied.touchedPaths,
            diffSha256: applied.diffSha256,
            requestId: patchCall.requestId,
          },
        });

        const { data: updated, error: updErr } = await supabase
          .from('runs')
          .update({
            status: 'patch_testing',
            current_stage: 'patch_testing',
            attempt_count: nextAttempt,
            input_tokens: claimedRun.input_tokens + patchCall.inputTokens,
            output_tokens: claimedRun.output_tokens + patchCall.outputTokens,
          })
          .eq('id', runId)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (updErr || !updated) throw new Error(updErr?.message || 'Failed to save patch stage');
        return {
          run: updated as RunRow,
          advanced: true,
          message: `Candidate patch #${nextAttempt} validated; advancing to isolated sandbox test.`,
        };
      }

      case 'patch_testing': {
        const slice = await fetchPinnedRepositorySlice({
          repositoryFullName: incident.repository_full_name,
          baseSha: incident.base_sha,
        });

        const { data: patchRows } = await supabase
          .from('patches')
          .select('*')
          .eq('run_id', runId)
          .order('attempt_number', { ascending: false })
          .limit(1);

        const latestPatch = (patchRows as PatchRow[] | null)?.[0];
        if (!latestPatch) {
          throw new Error('No candidate patch found to test.');
        }

        // Reconstruct modified files from unified diff lines on touched files
        const patchedFiles = applyUnifiedDiffToSlice(slice.files, latestPatch.unified_diff);
        const candidateResult = await runTestsInVercelSandbox({
          files: patchedFiles,
        });

        await supabase.from('test_results').insert({
          run_id: runId,
          user_id: userId,
          patch_id: latestPatch.id,
          kind: 'candidate',
          command: candidateResult.command,
          exit_code: candidateResult.exitCode,
          passed: candidateResult.passed,
          failed: candidateResult.failed,
          duration_ms: candidateResult.durationMs,
          stdout_excerpt: candidateResult.stdoutExcerpt,
          stderr_excerpt: candidateResult.stderrExcerpt,
          is_demo: false,
        });

        const { data: baselineRows } = await supabase
          .from('test_results')
          .select('*')
          .eq('run_id', runId)
          .eq('kind', 'baseline')
          .order('created_at', { ascending: false })
          .limit(1);
        const baseline = (baselineRows as TestResultRow[] | null)?.[0];

        if (!baseline) {
          throw new Error('Missing baseline test result for deterministic comparison.');
        }

        const evaluation = evaluateTestOutcome(
          {
            exitCode: baseline.exit_code,
            command: baseline.command,
            passed: baseline.passed,
            failed: baseline.failed,
          },
          {
            exitCode: candidateResult.exitCode,
            command: candidateResult.command,
            passed: candidateResult.passed,
            failed: candidateResult.failed,
          },
        );

        if (evaluation.isVerified) {
          await supabase.rpc('append_run_event', {
            p_run_id: runId,
            p_stage: 'verified',
            p_event_type: 'verification_succeeded',
            p_summary: `${evaluation.reason} Ready for human diff review and draft PR approval.`,
            p_payload: {
              attemptNumber: latestPatch.attempt_number,
              patchId: latestPatch.id,
              diffSha256: latestPatch.diff_sha256,
              exitCode: candidateResult.exitCode,
              passed: candidateResult.passed,
              failed: candidateResult.failed,
              durationMs: candidateResult.durationMs,
            },
          });

          const { data: updated } = await supabase
            .from('runs')
            .update({
              status: 'verified',
              current_stage: 'awaiting_approval',
              finished_at: new Date().toISOString(),
              last_error: null,
            })
            .eq('id', runId)
            .eq('user_id', userId)
            .select('*')
            .single();

          return {
            run: (updated ?? claimedRun) as RunRow,
            advanced: true,
            message: evaluation.reason,
          };
        }

        // Candidate test failed: either refine once (if attempt_count < 2) or mark unverified
        if (claimedRun.attempt_count < MAX_PATCH_ATTEMPTS) {
          await supabase.rpc('append_run_event', {
            p_run_id: runId,
            p_stage: 'refining',
            p_event_type: 'repair_iteration_scheduled',
            p_summary: `${evaluation.reason} Scheduling autonomous repair reflection (attempt 2/${MAX_PATCH_ATTEMPTS}).`,
            p_payload: {
              exitCode: candidateResult.exitCode,
              failed: candidateResult.failed,
            },
          });

          const { data: updated } = await supabase
            .from('runs')
            .update({
              status: 'refining',
              current_stage: 'refining',
              last_error: evaluation.reason,
            })
            .eq('id', runId)
            .eq('user_id', userId)
            .select('*')
            .single();

          return {
            run: (updated ?? claimedRun) as RunRow,
            advanced: true,
            message: 'Candidate patch failed tests; scheduled single repair iteration.',
          };
        }

        await supabase.rpc('append_run_event', {
          p_run_id: runId,
          p_stage: 'unverified',
          p_event_type: 'verification_failed',
          p_summary: `${evaluation.reason} Maximum repair attempts (${MAX_PATCH_ATTEMPTS}) reached; marking run Unverified.`,
          p_payload: {
            exitCode: candidateResult.exitCode,
            failed: candidateResult.failed,
          },
        });

        const { data: updated } = await supabase
          .from('runs')
          .update({
            status: 'unverified',
            current_stage: 'unverified',
            finished_at: new Date().toISOString(),
            last_error: evaluation.reason,
          })
          .eq('id', runId)
          .eq('user_id', userId)
          .select('*')
          .single();

        return {
          run: (updated ?? claimedRun) as RunRow,
          advanced: true,
          message: evaluation.reason,
        };
      }

      default:
        return {
          run: claimedRun,
          advanced: false,
          message: `Run is in state ${claimedRun.status} and requires no stage advancement.`,
        };
    }
  } catch (err) {
    const sanitizedError = redactSecrets(
      err instanceof Error ? err.message : String(err),
      600,
    );

    await supabase.rpc('append_run_event', {
      p_run_id: runId,
      p_stage: claimedRun.current_stage,
      p_event_type: 'stage_error',
      p_summary: `Stage "${claimedRun.current_stage}" failed: ${sanitizedError}`,
      p_payload: {
        stage: claimedRun.current_stage,
        error: sanitizedError,
      },
    });

    const { data: failedRun } = await supabase
      .from('runs')
      .update({
        status: 'failed',
        current_stage: 'failed',
        finished_at: new Date().toISOString(),
        last_error: sanitizedError,
      })
      .eq('id', runId)
      .eq('user_id', userId)
      .select('*')
      .single();

    return {
      run: (failedRun ?? claimedRun) as RunRow,
      advanced: true,
      message: `Run failed at stage ${claimedRun.current_stage}: ${sanitizedError}`,
    };
  } finally {
    await supabase.rpc('release_run_claim', {
      p_run_id: runId,
      p_claim_token: claimToken,
    });
  }
}

export function applyUnifiedDiffToSlice(
  originalFiles: Array<{ path: string; content: string }>,
  unifiedDiff: string,
): Array<{ path: string; content: string }> {
  // Parse unified diff hunks deterministically
  const filePatches = unifiedDiff.split(/^--- a\//m).filter((chunk) => chunk.trim().length > 0);
  const updatedMap = new Map<string, string>();
  for (const f of originalFiles) {
    updatedMap.set(f.path, f.content.replace(/\r\n/g, '\n'));
  }

  for (const rawPatch of filePatches) {
    const lines = rawPatch.replace(/\r\n/g, '\n').split('\n');
    const pathLine = lines[0]?.trim() ?? '';
    const targetPath = pathLine.split('\t')[0]?.trim();
    if (!targetPath || !updatedMap.has(targetPath)) continue;

    const origLines = (updatedMap.get(targetPath) ?? '').split('\n');
    const resultLines: string[] = [];
    let origIdx = 0;

    let i = 1;
    while (i < lines.length && !lines[i].startsWith('@@')) {
      i++;
    }

    while (i < lines.length) {
      const header = lines[i];
      const match = header.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (!match) {
        i++;
        continue;
      }
      const hunkStartOrig = Number.parseInt(match[1], 10) - 1;
      while (origIdx < hunkStartOrig && origIdx < origLines.length) {
        resultLines.push(origLines[origIdx]);
        origIdx++;
      }
      i++;
      while (i < lines.length && !lines[i].startsWith('@@')) {
        const hLine = lines[i];
        if (hLine.startsWith('+')) {
          resultLines.push(hLine.slice(1));
        } else if (hLine.startsWith('-')) {
          origIdx++;
        } else if (hLine.startsWith(' ')) {
          resultLines.push(hLine.slice(1));
          origIdx++;
        } else if (hLine.startsWith('\\ No newline')) {
          // ignore marker
        }
        i++;
      }
    }

    while (origIdx < origLines.length) {
      resultLines.push(origLines[origIdx]);
      origIdx++;
    }

    updatedMap.set(targetPath, resultLines.join('\n'));
  }

  return originalFiles.map((f) => ({
    path: f.path,
    content: updatedMap.get(f.path) ?? f.content,
  }));
}
