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
      className="genesis-card overflow-hidden"
    >
      {/* Header banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] bg-[#FAFAFA] px-5 py-4">
        <div className="flex items-center gap-3">
          {isVerified ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : isFailedOrUnverified ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30">
              <XCircle className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="proof-of-fix-heading"
                className="text-[18px] font-bold tracking-[-0.03em] text-[#0A0A0A] font-display"
              >
                Proof of Fix — Deterministic Before/After Verification
              </h2>
              {isRecordedDemo ? (
                <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1 font-mono text-[11px] font-medium text-[#F59E0B]">
                  RECORDED CASE STUDY
                </span>
              ) : (
                <span className="rounded-full border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-1 font-mono text-[11px] font-medium text-[#10B981]">
                  LIVE EXECUTION ARTIFACT
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#6B6B6B] mt-0.5">
              Same pinned SHA, dependency lockfile, and test command executed in isolated sandboxes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {latestPatch && (
            <button
              type="button"
              onClick={handleDownloadPatch}
              className="genesis-btn-secondary inline-flex h-[32px] items-center gap-1.5 px-3 text-[13px]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export .patch</span>
            </button>
          )}
          {showReviewLink && !isRecordedDemo && isVerified && (
            <Link
              href={`/app/incidents/${run.id}/review`}
              className="genesis-btn-primary inline-flex h-[32px] items-center gap-1.5 px-3.5 text-[13px]"
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
              className="inline-flex h-[32px] items-center gap-1.5 rounded-[6px] border border-[#10B981]/40 bg-[#10B981]/10 px-3 text-[13px] font-medium text-[#10B981] hover:-translate-y-[1px] transition-all"
            >
              <GitPullRequestDraft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Draft PR #{pullRequest.github_pr_number}</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Metadata provenance grid */}
      <div className="grid grid-cols-1 gap-4 border-b border-[#E8E8EC] bg-[#FFFFFF] p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
            <GitCommit className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Repository &amp; Pinned Base SHA</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-medium text-[#0A0A0A] truncate">
            {incident.repository_full_name}
          </p>
          <p className="font-mono text-[12px] text-[#6366F1] truncate" title={incident.base_sha}>
            SHA: {incident.base_sha.slice(0, 16)}
          </p>
        </div>

        <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
            <Cpu className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Nebius / NVIDIA Model</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-medium text-[#0A0A0A] truncate" title={run.model_id}>
            {run.model_id}
          </p>
          <p className="font-mono text-[12px] text-[#6B6B6B]">
            Tokens: {run.input_tokens} in / {run.output_tokens} out
          </p>
        </div>

        <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
            <FileCode2 className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Attempt &amp; Touched Paths</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-medium text-[#0A0A0A]">
            Attempt {run.attempt_count} / 2
          </p>
          <p className="font-mono text-[12px] text-[#6B6B6B] truncate">
            {latestPatch ? latestPatch.touched_paths.join(', ') : 'No patch applied yet'}
          </p>
        </div>

        <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
            <Clock className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Verification Status &amp; Elapsed</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-medium uppercase tracking-wider text-[#0A0A0A]">
            {run.status.replace(/_/g, ' ')}
          </p>
          <p className="font-mono text-[12px] text-[#6B6B6B]">
            {durationSeconds !== null ? `${durationSeconds}s total duration` : 'In progress'}
          </p>
        </div>
      </div>

      {/* Side-by-side Baseline Red vs Patched Green Cards */}
      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
        {/* Baseline Card */}
        <div className="rounded-[12px] border border-[#EF4444]/35 bg-[#FAFAFA] p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EF4444]/10 px-3 py-1 font-mono text-[12px] font-medium text-[#EF4444]">
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>1. BASELINE CHECK (UNMODIFIED SHA)</span>
            </span>
            {baselineTest && (
              <span className="font-mono text-[12px] text-[#9C9C9C]">
                {baselineTest.duration_ms}ms
              </span>
            )}
          </div>

          {baselineTest ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#E8E8EC] bg-[#FFFFFF] px-3 py-2 font-mono text-[12px]">
                <span className="text-[#6B6B6B]">
                  Command: <strong className="text-[#0A0A0A]">{baselineTest.command}</strong>
                </span>
                <span
                  className={
                    baselineTest.exit_code !== 0
                      ? 'text-[#EF4444] font-medium'
                      : 'text-[#F59E0B] font-medium'
                  }
                >
                  Exit Code: {baselineTest.exit_code}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-mono px-1">
                <span className="text-[#EF4444] font-medium">
                  Failed: {baselineTest.failed !== null ? baselineTest.failed : 'N/A (see exit code)'}
                </span>
                <span className="text-[#10B981] font-medium">
                  Passed: {baselineTest.passed !== null ? baselineTest.passed : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[#6B6B6B]">
              Baseline test has not completed yet.
            </p>
          )}
        </div>

        {/* Patched Candidate Card */}
        <div
          className={`rounded-[12px] border p-4 bg-[#FAFAFA] ${
            latestCandidateTest?.exit_code === 0
              ? 'border-[#10B981]/40'
              : 'border-[#E8E8EC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[12px] font-medium ${
                latestCandidateTest?.exit_code === 0
                  ? 'bg-[#10B981]/10 text-[#10B981]'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B]'
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
              <span className="font-mono text-[12px] text-[#9C9C9C]">
                {latestCandidateTest.duration_ms}ms
              </span>
            )}
          </div>

          {latestCandidateTest ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#E8E8EC] bg-[#FFFFFF] px-3 py-2 font-mono text-[12px]">
                <span className="text-[#6B6B6B]">
                  Command: <strong className="text-[#0A0A0A]">{latestCandidateTest.command}</strong>
                </span>
                <span
                  className={
                    latestCandidateTest.exit_code === 0
                      ? 'text-[#10B981] font-medium'
                      : 'text-[#EF4444] font-medium'
                  }
                >
                  Exit Code: {latestCandidateTest.exit_code}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-mono px-1">
                <span
                  className={
                    (latestCandidateTest.failed ?? 0) === 0
                      ? 'text-[#6B6B6B]'
                      : 'text-[#EF4444]'
                  }
                >
                  Failed: {latestCandidateTest.failed !== null ? latestCandidateTest.failed : '0'}
                </span>
                <span className="text-[#10B981] font-medium">
                  Passed: {latestCandidateTest.passed !== null ? latestCandidateTest.passed : 'All'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[#6B6B6B]">
              Post-patch verification test has not run yet.
            </p>
          )}
        </div>
      </div>

      {/* Root cause & Evidence section */}
      {run.diagnosis_json && (
        <div className="border-t border-[#E8E8EC] px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-bold text-[#0A0A0A] font-display">
              Root-Cause Diagnosis &amp; Line-Linked Evidence
            </h3>
            <span className="rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1 font-mono text-[11px] font-medium text-[#10B981]">
              Confidence: {run.diagnosis_json.confidenceLabel.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-[#0A0A0A]">
            {run.diagnosis_json.rootCause}
          </p>

          {run.diagnosis_json.evidencePaths?.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {run.diagnosis_json.evidencePaths.map((ev, idx) => (
                <div
                  key={`${ev.path}-${idx}`}
                  className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5"
                >
                  <div className="font-mono text-[12px] font-medium text-[#6366F1]">
                    {ev.path}:{ev.lines}
                  </div>
                  <p className="mt-1 text-[13px] text-[#6B6B6B]">{ev.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unified Diff Viewer */}
      {latestPatch && (
        <div className="border-t border-[#E8E8EC] px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-[16px] font-bold text-[#0A0A0A] font-display">
                Validated Candidate Patch (Attempt #{latestPatch.attempt_number})
              </h3>
              <p className="text-[13px] text-[#6B6B6B] mt-0.5">{latestPatch.rationale}</p>
            </div>
            <span
              className="rounded-[4px] bg-[#FAFAFA] px-2.5 py-1 font-mono text-[11px] text-[#6B6B6B] border border-[#E8E8EC]"
              title={latestPatch.diff_sha256}
            >
              SHA-256: {latestPatch.diff_sha256.slice(0, 16)}…
            </span>
          </div>

          <div className="overflow-x-auto rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5 font-mono text-[12px] leading-relaxed">
            {latestPatch.unified_diff.split('\n').map((line, idx) => {
              let lineClass = 'text-[#6B6B6B]';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass = 'bg-[#10B981]/15 text-[#0A0A0A] font-medium';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass = 'bg-[#EF4444]/15 text-[#EF4444]';
              } else if (line.startsWith('@@')) {
                lineClass = 'text-[#6366F1] font-medium';
              }
              return (
                <div key={idx} className={`px-2 py-0.5 whitespace-pre rounded-[4px] ${lineClass}`}>
                  <span className="inline-block w-8 select-none text-right pr-3 text-[#9C9C9C]">
                    {idx + 1}
                  </span>
                  {line}
                </div>
              );
            })}
          </div>

          {latestPatch.risk_notes && (
            <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] px-3.5 py-2.5 text-[13px] text-[#6B6B6B]">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[#F59E0B] mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-[#0A0A0A]">Risk &amp; Scope Notes:</strong>{' '}
                {latestPatch.risk_notes}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab-accessible Sandbox Test Output Logs */}
      {(baselineTest || latestCandidateTest) && (
        <div className="border-t border-[#E8E8EC] px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <h3 className="text-[16px] font-bold text-[#0A0A0A] font-display">
                Isolated Sandbox Runner Output (Redacted)
              </h3>
            </div>
            <div
              role="tablist"
              aria-label="Test output logs"
              className="flex rounded-[6px] bg-[#FAFAFA] p-1 border border-[#E8E8EC]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeLogTab === 'baseline'}
                onClick={() => setActiveLogTab('baseline')}
                className={`rounded-[4px] px-3 py-1 font-mono text-[12px] transition-colors ${
                  activeLogTab === 'baseline'
                    ? 'bg-[#FFFFFF] text-[#EF4444] font-medium border border-[#E8E8EC]'
                    : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                Baseline Log (Exit {baselineTest?.exit_code ?? '—'})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLogTab === 'candidate'}
                onClick={() => setActiveLogTab('candidate')}
                className={`rounded-[4px] px-3 py-1 font-mono text-[12px] transition-colors ${
                  activeLogTab === 'candidate'
                    ? 'bg-[#FFFFFF] text-[#10B981] font-medium border border-[#E8E8EC]'
                    : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                Post-Patch Log (Exit {latestCandidateTest?.exit_code ?? '—'})
              </button>
            </div>
          </div>

          <pre className="max-h-64 overflow-auto rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4 font-mono text-[12px] text-[#0A0A0A] whitespace-pre-wrap">
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
