'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  FileCode2,
  GitCommit,
  GitPullRequestDraft,
  ShieldAlert,
  Terminal,
  XCircle,
} from 'lucide-react';
import type { CompleteRunBundle } from '@/lib/supabase/types';

interface ProofOfFixPanelProps {
  bundle: CompleteRunBundle;
  isRecordedDemo?: boolean;
  showReviewLink?: boolean;
}

export function ProofOfFixPanel({
  bundle,
  isRecordedDemo = false,
  showReviewLink = true,
}: ProofOfFixPanelProps) {
  const { incident, run, patches, testResults, pullRequest } = bundle;
  const [activeLogTab, setActiveLogTab] = useState<'baseline' | 'candidate'>('candidate');

  const baselineTest = testResults.find((t) => t.kind === 'baseline') ?? null;
  const candidateTests = testResults.filter((t) => t.kind === 'candidate');
  const latestCandidateTest = candidateTests[candidateTests.length - 1] ?? null;
  const latestPatch = patches[patches.length - 1] ?? null;

  const isVerified = run.status === 'verified' || run.status === 'draft_pr_created';
  const isFailedOrUnverified = run.status === 'failed' || run.status === 'unverified';

  const durationSeconds =
    run.started_at && run.finished_at
      ? Math.max(
          1,
          Math.round(
            (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000,
          ),
        )
      : null;

  function handleDownloadPatch() {
    if (!latestPatch) return;
    const blob = new Blob([latestPatch.unified_diff], { type: 'text/x-diff;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repomedic-${run.id.slice(0, 8)}-attempt-${latestPatch.attempt_number}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      aria-labelledby="proof-of-fix-heading"
      className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] shadow-lg overflow-hidden"
    >
      {/* Header banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#9EB0C1]/15 bg-[#182331] px-5 py-4">
        <div className="flex items-center gap-3">
          {isVerified ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#21BD9D]/15 text-[#21BD9D] border border-[#21BD9D]/40">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : isFailedOrUnverified ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/40">
              <XCircle className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="proof-of-fix-heading" className="text-base font-semibold text-[#F2F7FB]">
                Proof of Fix — Deterministic Before/After Verification
              </h2>
              {isRecordedDemo ? (
                <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#F59E0B]">
                  RECORDED CASE STUDY
                </span>
              ) : (
                <span className="rounded-full border border-[#28C8DB]/40 bg-[#28C8DB]/15 px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#28C8DB]">
                  LIVE EXECUTION ARTIFACT
                </span>
              )}
            </div>
            <p className="text-xs text-[#9EB0C1] mt-0.5">
              Same pinned SHA, dependency lockfile, and test command executed in isolated sandboxes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {latestPatch && (
            <button
              type="button"
              onClick={handleDownloadPatch}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#9EB0C1]/25 bg-[#111923] px-3 py-1.5 text-xs font-medium text-[#F2F7FB] hover:border-[#28C8DB]/50 hover:text-[#28C8DB] transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export .patch</span>
            </button>
          )}
          {showReviewLink && !isRecordedDemo && isVerified && (
            <Link
              href={`/app/incidents/${run.id}/review`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#28C8DB] px-3.5 py-1.5 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] transition-colors"
            >
              <GitPullRequestDraft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Review &amp; Approve Draft PR</span>
            </Link>
          )}
          {pullRequest && (
            <a
              href={pullRequest.github_pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#21BD9D]/50 bg-[#21BD9D]/15 px-3 py-1.5 text-xs font-semibold text-[#21BD9D] hover:bg-[#21BD9D]/25 transition-colors"
            >
              <GitPullRequestDraft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Draft PR #{pullRequest.github_pr_number}</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Metadata provenance grid */}
      <div className="grid grid-cols-1 gap-3 border-b border-[#9EB0C1]/15 bg-[#0B1017]/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#9EB0C1]/15 bg-[#111923] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#9EB0C1]">
            <GitCommit className="h-3.5 w-3.5 text-[#28C8DB]" aria-hidden="true" />
            <span>Repository &amp; Pinned Base SHA</span>
          </div>
          <p className="mt-1 font-mono text-xs font-medium text-[#F2F7FB] truncate">
            {incident.repository_full_name}
          </p>
          <p className="font-mono text-[11px] text-[#28C8DB] truncate" title={incident.base_sha}>
            SHA: {incident.base_sha.slice(0, 16)}
          </p>
        </div>

        <div className="rounded-lg border border-[#9EB0C1]/15 bg-[#111923] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#9EB0C1]">
            <Cpu className="h-3.5 w-3.5 text-[#28C8DB]" aria-hidden="true" />
            <span>Nebius / NVIDIA Model</span>
          </div>
          <p className="mt-1 font-mono text-xs font-medium text-[#F2F7FB] truncate" title={run.model_id}>
            {run.model_id}
          </p>
          <p className="font-mono text-[11px] text-[#9EB0C1]">
            Tokens: {run.input_tokens} in / {run.output_tokens} out
          </p>
        </div>

        <div className="rounded-lg border border-[#9EB0C1]/15 bg-[#111923] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#9EB0C1]">
            <FileCode2 className="h-3.5 w-3.5 text-[#28C8DB]" aria-hidden="true" />
            <span>Attempt &amp; Touched Paths</span>
          </div>
          <p className="mt-1 font-mono text-xs font-medium text-[#F2F7FB]">
            Attempt {run.attempt_count} / 2
          </p>
          <p className="font-mono text-[11px] text-[#9EB0C1] truncate">
            {latestPatch ? latestPatch.touched_paths.join(', ') : 'No patch applied yet'}
          </p>
        </div>

        <div className="rounded-lg border border-[#9EB0C1]/15 bg-[#111923] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#9EB0C1]">
            <Clock className="h-3.5 w-3.5 text-[#28C8DB]" aria-hidden="true" />
            <span>Verification Status &amp; Elapsed</span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#F2F7FB]">
            {run.status.replace(/_/g, ' ')}
          </p>
          <p className="font-mono text-[11px] text-[#9EB0C1]">
            {durationSeconds !== null ? `${durationSeconds}s total duration` : 'In progress'}
          </p>
        </div>
      </div>

      {/* Side-by-side Baseline Red vs Patched Green Cards */}
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
        {/* Baseline Card */}
        <div className="rounded-xl border border-[#F43F5E]/35 bg-[#0B1017] p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F43F5E]/15 px-2.5 py-1 font-mono text-xs font-semibold text-[#F43F5E]">
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>1. BASELINE CHECK (UNMODIFIED SHA)</span>
            </span>
            {baselineTest && (
              <span className="font-mono text-xs text-[#9EB0C1]">
                {baselineTest.duration_ms}ms
              </span>
            )}
          </div>

          {baselineTest ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#111923] px-3 py-2 font-mono text-xs">
                <span className="text-[#9EB0C1]">
                  Command: <strong className="text-[#F2F7FB]">{baselineTest.command}</strong>
                </span>
                <span
                  className={
                    baselineTest.exit_code !== 0
                      ? 'text-[#F43F5E] font-semibold'
                      : 'text-[#F59E0B] font-semibold'
                  }
                >
                  Exit Code: {baselineTest.exit_code}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono px-1">
                <span className="text-[#F43F5E]">
                  Failed: {baselineTest.failed !== null ? baselineTest.failed : 'N/A (see exit code)'}
                </span>
                <span className="text-[#21BD9D]">
                  Passed: {baselineTest.passed !== null ? baselineTest.passed : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#9EB0C1]">
              Baseline test has not completed yet.
            </p>
          )}
        </div>

        {/* Patched Candidate Card */}
        <div
          className={`rounded-xl border p-4 bg-[#0B1017] ${
            latestCandidateTest?.exit_code === 0
              ? 'border-[#21BD9D]/40'
              : 'border-[#9EB0C1]/25'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-semibold ${
                latestCandidateTest?.exit_code === 0
                  ? 'bg-[#21BD9D]/15 text-[#21BD9D]'
                  : 'bg-[#F59E0B]/15 text-[#F59E0B]'
              }`}
            >
              {latestCandidateTest?.exit_code === 0 ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>2. POST-PATCH CHECK (ISOLATED SANDBOX)</span>
            </span>
            {latestCandidateTest && (
              <span className="font-mono text-xs text-[#9EB0C1]">
                {latestCandidateTest.duration_ms}ms
              </span>
            )}
          </div>

          {latestCandidateTest ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#111923] px-3 py-2 font-mono text-xs">
                <span className="text-[#9EB0C1]">
                  Command: <strong className="text-[#F2F7FB]">{latestCandidateTest.command}</strong>
                </span>
                <span
                  className={
                    latestCandidateTest.exit_code === 0
                      ? 'text-[#21BD9D] font-semibold'
                      : 'text-[#F43F5E] font-semibold'
                  }
                >
                  Exit Code: {latestCandidateTest.exit_code}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono px-1">
                <span
                  className={
                    (latestCandidateTest.failed ?? 0) === 0
                      ? 'text-[#9EB0C1]'
                      : 'text-[#F43F5E]'
                  }
                >
                  Failed: {latestCandidateTest.failed !== null ? latestCandidateTest.failed : '0'}
                </span>
                <span className="text-[#21BD9D] font-semibold">
                  Passed: {latestCandidateTest.passed !== null ? latestCandidateTest.passed : 'All'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#9EB0C1]">
              Post-patch verification test has not run yet.
            </p>
          )}
        </div>
      </div>

      {/* Root cause & Evidence section */}
      {run.diagnosis_json && (
        <div className="border-t border-[#9EB0C1]/15 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#F2F7FB]">
              Root-Cause Diagnosis &amp; Line-Linked Evidence
            </h3>
            <span className="rounded border border-[#28C8DB]/30 bg-[#28C8DB]/10 px-2 py-0.5 font-mono text-[11px] text-[#28C8DB]">
              Confidence: {run.diagnosis_json.confidenceLabel.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#F2F7FB]/90">
            {run.diagnosis_json.rootCause}
          </p>

          {run.diagnosis_json.evidencePaths?.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {run.diagnosis_json.evidencePaths.map((ev, idx) => (
                <div
                  key={`${ev.path}-${idx}`}
                  className="rounded-lg border border-[#9EB0C1]/15 bg-[#0B1017] p-3"
                >
                  <div className="font-mono text-xs font-semibold text-[#28C8DB]">
                    {ev.path}:{ev.lines}
                  </div>
                  <p className="mt-1 text-xs text-[#9EB0C1]">{ev.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unified Diff Viewer */}
      {latestPatch && (
        <div className="border-t border-[#9EB0C1]/15 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-[#F2F7FB]">
                Validated Candidate Patch (Attempt #{latestPatch.attempt_number})
              </h3>
              <p className="text-xs text-[#9EB0C1] mt-0.5">{latestPatch.rationale}</p>
            </div>
            <span
              className="rounded bg-[#0B1017] px-2.5 py-1 font-mono text-[11px] text-[#9EB0C1] border border-[#9EB0C1]/15"
              title={latestPatch.diff_sha256}
            >
              SHA-256: {latestPatch.diff_sha256.slice(0, 16)}…
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#9EB0C1]/20 bg-[#0B1017] p-3 font-mono text-xs leading-relaxed">
            {latestPatch.unified_diff.split('\n').map((line, idx) => {
              let lineClass = 'text-[#9EB0C1]';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass = 'bg-[#21BD9D]/15 text-[#21BD9D]';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass = 'bg-[#F43F5E]/15 text-[#F43F5E]';
              } else if (line.startsWith('@@')) {
                lineClass = 'text-[#28C8DB]';
              }
              return (
                <div key={idx} className={`px-2 py-0.5 whitespace-pre ${lineClass}`}>
                  <span className="inline-block w-8 select-none text-right pr-3 text-[#9EB0C1]/40">
                    {idx + 1}
                  </span>
                  {line}
                </div>
              );
            })}
          </div>

          {latestPatch.risk_notes && (
            <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-[#9EB0C1]/15 bg-[#0B1017]/60 px-3 py-2 text-xs text-[#9EB0C1]">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[#28C8DB] mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-[#F2F7FB]">Risk &amp; Scope Notes:</strong>{' '}
                {latestPatch.risk_notes}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab-accessible Sandbox Test Output Logs */}
      {(baselineTest || latestCandidateTest) && (
        <div className="border-t border-[#9EB0C1]/15 px-5 py-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#28C8DB]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[#F2F7FB]">
                Isolated Sandbox Runner Output (Redacted)
              </h3>
            </div>
            <div role="tablist" aria-label="Test output logs" className="flex rounded-lg bg-[#0B1017] p-1 border border-[#9EB0C1]/15">
              <button
                type="button"
                role="tab"
                aria-selected={activeLogTab === 'baseline'}
                onClick={() => setActiveLogTab('baseline')}
                className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                  activeLogTab === 'baseline'
                    ? 'bg-[#182331] text-[#F43F5E] font-semibold'
                    : 'text-[#9EB0C1] hover:text-[#F2F7FB]'
                }`}
              >
                Baseline Log (Exit {baselineTest?.exit_code ?? '—'})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLogTab === 'candidate'}
                onClick={() => setActiveLogTab('candidate')}
                className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                  activeLogTab === 'candidate'
                    ? 'bg-[#182331] text-[#21BD9D] font-semibold'
                    : 'text-[#9EB0C1] hover:text-[#F2F7FB]'
                }`}
              >
                Post-Patch Log (Exit {latestCandidateTest?.exit_code ?? '—'})
              </button>
            </div>
          </div>

          <pre className="max-h-64 overflow-auto rounded-lg border border-[#9EB0C1]/20 bg-[#0B1017] p-3.5 font-mono text-xs text-[#F2F7FB]/90 whitespace-pre-wrap">
            {activeLogTab === 'baseline'
              ? `${baselineTest?.stdout_excerpt || ''}\n${baselineTest?.stderr_excerpt || ''}`.trim() ||
                'No baseline log output recorded.'
              : `${latestCandidateTest?.stdout_excerpt || ''}\n${latestCandidateTest?.stderr_excerpt || ''}`.trim() ||
                'No post-patch log output recorded yet.'}
          </pre>
        </div>
      )}
    </section>
  );
}
