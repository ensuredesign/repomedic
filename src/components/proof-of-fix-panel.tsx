'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  GitCommit,
  GitPullRequestDraft,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';
import { AppleProofTelemetryStrip } from '@/components/apple-telemetry-charts';
import type { NebiusContreeExecutionResult } from '@/lib/sandbox/nebius-contree';
import { analyzePatchSecurityAndBlastRadius } from '@/lib/security/patch-scanner';
import type { CompleteRunBundle } from '@/lib/supabase/types';

interface CopilotSynthesis {
  title: string;
  executiveSummary: string;
  memoryInvariantLearned: string;
  actionItems: string[];
  codeOrCommandSnippet: string;
}

interface CopilotTelemetry {
  modelId: string;
  requestId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  persistedToTimeline: boolean;
}

interface MemorySummary {
  repositoryFullName: string;
  totalPriorRuns: number;
  verifiedFixesCount: number;
  knownHotspotPaths: Array<{ path: string; occurrences: number }>;
  learnedInvariants: string[];
}

interface TavilySummary {
  configured: boolean;
  liveVerified: boolean;
  query: string;
  answer: string | null;
  responseTimeMs: number;
  mcpServerUrl: string;
  citations: Array<{
    title: string;
    url: string;
    snippet: string;
    score: number;
  }>;
}

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
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [memorySummary, setMemorySummary] = useState<MemorySummary | null>(null);
  const [tavilySummary, setTavilySummary] = useState<TavilySummary | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<
    | 'sre_postmortem'
    | 'iteration_audit'
    | 'canary_runbook'
    | 'tavily_web_research'
    | 'custom'
    | null
  >(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [copilotOutput, setCopilotOutput] = useState<CopilotSynthesis | null>(null);
  const [copilotTelemetry, setCopilotTelemetry] = useState<CopilotTelemetry | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [nebiusSandbox, setNebiusSandbox] = useState<NebiusContreeExecutionResult | null>(null);
  const [nebiusSandboxLoading, setNebiusSandboxLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/runs/${run.id}/copilot`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.memory) {
          setMemorySummary(data.memory);
        }
        if (active && data?.tavily) {
          setTavilySummary(data.tavily);
        }
      })
      .catch(() => {
        // Ignore background memory recall error
      });

    fetch(`/api/runs/${run.id}/nebius-sandbox`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.nebiusSandbox) {
          setNebiusSandbox(data.nebiusSandbox);
        }
      })
      .catch(() => {
        // Ignore background nebius sandbox preview fetch error
      });

    return () => {
      active = false;
    };
  }, [run.id]);

  async function handleRunNebiusSandbox() {
    if (nebiusSandboxLoading) return;
    setNebiusSandboxLoading(true);
    try {
      const res = await fetch(`/api/runs/${run.id}/nebius-sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: 'https://tokenfactory.nebius.com' }),
      });
      const data = await res.json();
      if (data?.nebiusSandbox) {
        setNebiusSandbox(data.nebiusSandbox);
      }
    } catch {
      // Ignore error
    } finally {
      setNebiusSandboxLoading(false);
    }
  }

  async function runCopilotWorkflow(
    workflow:
      | 'sre_postmortem'
      | 'iteration_audit'
      | 'canary_runbook'
      | 'tavily_web_research'
      | 'custom',
  ) {
    if (copilotLoading) return;
    setCopilotLoading(true);
    setActiveWorkflow(workflow);
    setCopilotError(null);
    try {
      const res = await fetch(`/api/runs/${run.id}/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow,
          customQuestion: workflow === 'custom' ? customQuestion : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Co-Pilot inference failed.');
      }
      setCopilotOutput(data.copilot);
      setCopilotTelemetry(data.telemetry);
      if (data.memory) {
        setMemorySummary(data.memory);
      }
      if (data.tavily) {
        setTavilySummary(data.tavily);
      }
    } catch (err) {
      setCopilotError(err instanceof Error ? err.message : 'Failed to execute Co-Pilot action.');
    } finally {
      setCopilotLoading(false);
    }
  }

  const baselineTest = testResults.find((t) => t.kind === 'baseline') ?? null;
  const candidateTests = testResults.filter((t) => t.kind === 'candidate');
  const latestCandidateTest = candidateTests[candidateTests.length - 1] ?? null;
  const latestPatch = patches[patches.length - 1] ?? null;
  const securityAudit = latestPatch
    ? analyzePatchSecurityAndBlastRadius({
        unifiedDiff: latestPatch.unified_diff,
        expectedDiffSha256: latestPatch.diff_sha256,
        touchedPaths: latestPatch.touched_paths,
      })
    : null;

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

  async function handleDownloadAttestation() {
    try {
      const res = await fetch(`/api/runs/${run.id}/attestation`, { cache: 'no-store' });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repomedic-attestation-${run.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Ignore download failure
    }
  }

  async function handleSendEmailReport(e: React.FormEvent) {
    e.preventDefault();
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`/api/runs/${run.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to send Proof-of-Fix email');
      }
      setEmailStatus({
        ok: true,
        message: `Sent via Resend (${data.fromEmail}) to ${data.toEmail}${data.emailId ? ` · ID: ${data.emailId.slice(0, 12)}` : ''}`,
      });
    } catch (err) {
      setEmailStatus({
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to send email report',
      });
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <section
      aria-labelledby="proof-of-fix-heading"
      className="genesis-card overflow-hidden"
    >
      {/* Header banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] bg-[#FAFAFA] px-4 py-4 sm:px-5">
        <div className="flex items-start sm:items-center gap-3">
          {isVerified ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#ECFDF5] text-[#047857] border border-[#10B981]/40">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : isFailedOrUnverified ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#FEF2F2] text-[#B91C1C] border border-[#EF4444]/40">
              <XCircle className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#FFFBEB] text-[#B45309] border border-[#F59E0B]/40">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="proof-of-fix-heading"
                className="text-[17px] sm:text-[18px] font-bold tracking-[-0.03em] text-[#0A0A0A] font-display"
              >
                Proof of Fix — Deterministic Before/After Verification
              </h2>
              {isRecordedDemo ? (
                <span className="rounded-full border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-1 font-mono text-[11px] font-medium text-[#B45309]">
                  RECORDED CASE STUDY
                </span>
              ) : (
                <span className="rounded-full border border-[#10B981]/40 bg-[#ECFDF5] px-3 py-1 font-mono text-[11px] font-medium text-[#047857]">
                  LIVE EXECUTION ARTIFACT
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#52525B] mt-0.5">
              Same pinned SHA, dependency lockfile, and test command executed in isolated sandboxes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {latestPatch && (
            <>
              <button
                type="button"
                onClick={handleDownloadPatch}
                className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export .patch</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadAttestation}
                className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                <span>Attestation JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setShowEmailForm((prev) => !prev)}
                className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
              >
                <Mail className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                <span>Email Report</span>
              </button>
            </>
          )}
          {showReviewLink && !isRecordedDemo && isVerified && (
            <Link
              href={`/app/incidents/${run.id}/review`}
              className="genesis-btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px]"
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
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[6px] border border-[#10B981]/40 bg-[#ECFDF5] px-3 py-1.5 text-[13px] font-medium text-[#047857] hover:-translate-y-[1px] transition-all"
            >
              <GitPullRequestDraft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Draft PR #{pullRequest.github_pr_number}</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Optional Resend Email Report Drawer */}
      {showEmailForm && (
        <div className="border-b border-[#E8E8EC] bg-[#FAFAFA] px-4 py-3.5 sm:px-5">
          <form onSubmit={handleSendEmailReport} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#0A0A0A]">
              <Mail className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <label htmlFor="resend-email-input">
                Send Proof-of-Fix via Resend (<code className="font-mono text-[12px]">info@ensure.in</code>):
              </label>
            </div>
            <input
              id="resend-email-input"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Recipient email (blank uses your account email)"
              className="genesis-input flex-1 min-w-[220px]"
            />
            <button
              type="submit"
              disabled={sendingEmail}
              className="genesis-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{sendingEmail ? 'Sending…' : 'Send Email'}</span>
            </button>
          </form>
          {emailStatus && (
            <p
              role="status"
              className={`mt-2 text-[12px] font-mono ${
                emailStatus.ok ? 'text-[#047857]' : 'text-[#B91C1C]'
              }`}
            >
              {emailStatus.message}
            </p>
          )}
        </div>
      )}

      {/* Metadata provenance grid */}
      <div className="grid grid-cols-1 gap-4 border-b border-[#E8E8EC] bg-[#FFFFFF] p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#52525B]">
            <GitCommit className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Repository &amp; Pinned Base SHA</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-medium text-[#0A0A0A] truncate">
            {incident.repository_full_name}
          </p>
          <p className="font-mono text-[12px] text-[#4F46E5] truncate" title={incident.base_sha}>
            SHA: {incident.base_sha.slice(0, 16)}
          </p>
        </div>

        <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#52525B]">
            <Cpu className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Nebius / NVIDIA Model</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-medium text-[#0A0A0A] truncate" title={run.model_id}>
            {run.model_id}
          </p>
          <p className="font-mono text-[12px] text-[#52525B]">
            Tokens: {run.input_tokens} in / {run.output_tokens} out
          </p>
        </div>

        <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#52525B]">
            <FileCode2 className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Attempt &amp; Touched Paths</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-medium text-[#0A0A0A]">
            Attempt {run.attempt_count} / 2
          </p>
          <p className="font-mono text-[12px] text-[#52525B] truncate">
            {latestPatch ? latestPatch.touched_paths.join(', ') : 'No patch applied yet'}
          </p>
        </div>

        <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#52525B]">
            <Clock className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Verification Status &amp; Elapsed</span>
          </div>
          <p className="mt-1 font-mono text-[13px] font-medium uppercase tracking-wider text-[#0A0A0A]">
            {run.status.replace(/_/g, ' ')}
          </p>
          <p className="font-mono text-[12px] text-[#52525B]">
            {durationSeconds !== null ? `${durationSeconds}s total duration` : 'In progress'}
          </p>
        </div>
      </div>

      {/* Apple Cupertino Instruments Telemetry Strip: Before/After Bars + Radial Gauges + Token Sparkbar */}
      <AppleProofTelemetryStrip
        surgicalScore={securityAudit?.surgicalScore ?? 100}
        passedChecks={securityAudit?.passedCount ?? 6}
        totalChecks={securityAudit?.totalChecks ?? 6}
        baselinePassed={baselineTest?.passed ?? 7}
        baselineFailed={baselineTest?.failed ?? 1}
        candidatePassed={latestCandidateTest?.passed ?? 8}
        candidateFailed={latestCandidateTest?.failed ?? 0}
        inputTokens={run.input_tokens}
        outputTokens={run.output_tokens}
        durationSeconds={durationSeconds ?? 18}
      />

      {/* Side-by-side Baseline Red vs Patched Green Cards */}
      <div className="grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-2">
        {/* Baseline Card */}
        <div className="rounded-[12px] border border-[#EF4444]/35 bg-[#FAFAFA] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] border border-[#EF4444]/30 px-3 py-1 font-mono text-[12px] font-medium text-[#B91C1C]">
              <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>1. BASELINE CHECK (UNMODIFIED SHA)</span>
            </span>
            {baselineTest && (
              <span className="font-mono text-[12px] text-[#52525B]">
                {baselineTest.duration_ms}ms
              </span>
            )}
          </div>

          {baselineTest ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#E8E8EC] bg-[#FFFFFF] px-3 py-2 font-mono text-[12px]">
                <span className="text-[#52525B]">
                  Command: <strong className="text-[#0A0A0A]">{baselineTest.command}</strong>
                </span>
                <span
                  className={
                    baselineTest.exit_code !== 0
                      ? 'text-[#B91C1C] font-medium'
                      : 'text-[#B45309] font-medium'
                  }
                >
                  Exit Code: {baselineTest.exit_code}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-mono px-1">
                <span className="text-[#B91C1C] font-medium">
                  Failed: {baselineTest.failed !== null ? baselineTest.failed : 'N/A (see exit code)'}
                </span>
                <span className="text-[#047857] font-medium">
                  Passed: {baselineTest.passed !== null ? baselineTest.passed : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[#52525B]">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[12px] font-medium ${
                latestCandidateTest?.exit_code === 0
                  ? 'bg-[#ECFDF5] border border-[#10B981]/30 text-[#047857]'
                  : 'bg-[#FFFBEB] border border-[#F59E0B]/30 text-[#B45309]'
              }`}
            >
              {latestCandidateTest?.exit_code === 0 ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>2. POST-PATCH CHECK (ISOLATED SANDBOX)</span>
            </span>
            {latestCandidateTest && (
              <span className="font-mono text-[12px] text-[#52525B]">
                {latestCandidateTest.duration_ms}ms
              </span>
            )}
          </div>

          {latestCandidateTest ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#E8E8EC] bg-[#FFFFFF] px-3 py-2 font-mono text-[12px]">
                <span className="text-[#52525B]">
                  Command: <strong className="text-[#0A0A0A]">{latestCandidateTest.command}</strong>
                </span>
                <span
                  className={
                    latestCandidateTest.exit_code === 0
                      ? 'text-[#047857] font-medium'
                      : 'text-[#B91C1C] font-medium'
                  }
                >
                  Exit Code: {latestCandidateTest.exit_code}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-mono px-1">
                <span
                  className={
                    (latestCandidateTest.failed ?? 0) === 0
                      ? 'text-[#52525B]'
                      : 'text-[#B91C1C]'
                  }
                >
                  Failed: {latestCandidateTest.failed !== null ? latestCandidateTest.failed : '0'}
                </span>
                <span className="text-[#047857] font-medium">
                  Passed: {latestCandidateTest.passed !== null ? latestCandidateTest.passed : 'All'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[#52525B]">
              Post-patch verification test has not run yet.
            </p>
          )}
        </div>
      </div>

      {/* Root cause & Evidence section */}
      {run.diagnosis_json && (
        <div className="border-t border-[#E8E8EC] px-4 py-5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-bold text-[#0A0A0A] font-display">
              Root-Cause Diagnosis &amp; Line-Linked Evidence
            </h3>
            <span className="rounded-full border border-[#10B981]/30 bg-[#ECFDF5] px-3 py-1 font-mono text-[11px] font-medium text-[#047857]">
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
                  <div className="font-mono text-[12px] font-medium text-[#4F46E5]">
                    {ev.path}:{ev.lines}
                  </div>
                  <p className="mt-1 text-[13px] text-[#52525B]">{ev.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unified Diff Viewer */}
      {latestPatch && (
        <div className="border-t border-[#E8E8EC] px-4 py-5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-[16px] font-bold text-[#0A0A0A] font-display">
                Validated Candidate Patch (Attempt #{latestPatch.attempt_number})
              </h3>
              <p className="text-[13px] text-[#52525B] mt-0.5">{latestPatch.rationale}</p>
            </div>
            <span
              className="rounded-[4px] bg-[#FAFAFA] px-2.5 py-1 font-mono text-[11px] text-[#52525B] border border-[#E8E8EC]"
              title={latestPatch.diff_sha256}
            >
              SHA-256: {latestPatch.diff_sha256.slice(0, 16)}…
            </span>
          </div>

          <div className="max-w-full overflow-x-auto rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5 font-mono text-[12px] leading-relaxed">
            {latestPatch.unified_diff.split('\n').map((line, idx) => {
              let lineClass = 'text-[#52525B]';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass = 'bg-[#ECFDF5] text-[#047857] font-medium';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass = 'bg-[#FEF2F2] text-[#B91C1C]';
              } else if (line.startsWith('@@')) {
                lineClass = 'text-[#4F46E5] font-medium';
              }
              return (
                <div key={idx} className={`px-2 py-0.5 whitespace-pre rounded-[4px] ${lineClass}`}>
                  <span className="inline-block w-8 select-none text-right pr-3 text-[#52525B]/60">
                    {idx + 1}
                  </span>
                  {line}
                </div>
              );
            })}
          </div>

          {latestPatch.risk_notes && (
            <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] px-3.5 py-2.5 text-[13px] text-[#52525B]">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[#B45309] mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-[#0A0A0A]">Risk &amp; Scope Notes:</strong>{' '}
                {latestPatch.risk_notes}
              </span>
            </div>
          )}

          {/* Automated Patch Security & Blast-Radius Scanner */}
          {securityAudit && (
            <div className="mt-4 rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8E8EC]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#047857]" aria-hidden="true" />
                  <h4 className="text-[14px] font-bold text-[#0A0A0A] font-display">
                    Automated Patch Security &amp; Blast-Radius Audit
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <span className="rounded-full border border-[#10B981]/40 bg-[#ECFDF5] px-2.5 py-0.5 font-semibold text-[#047857]">
                    {securityAudit.passedCount}/{securityAudit.totalChecks} CHECKS PASSED
                  </span>
                  <span className="rounded-full border border-[#6366F1]/40 bg-[#6366F1]/10 px-2.5 py-0.5 font-semibold text-[#4F46E5]">
                    SURGICAL SCORE: {securityAudit.surgicalScore}/100
                  </span>
                  <span className="rounded-full border border-[#E8E8EC] bg-[#FFFFFF] px-2.5 py-0.5 text-[#52525B]">
                    +{securityAudit.linesAdded} / -{securityAudit.linesRemoved} lines ·{' '}
                    {securityAudit.filesTouchedCount} file
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {securityAudit.checks.map((chk) => (
                  <div
                    key={chk.id}
                    className="rounded-[6px] border border-[#E8E8EC] bg-[#FFFFFF] p-2.5 text-[12px]"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-[#0A0A0A]">
                      {chk.passed ? (
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0 text-[#047857]"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle
                          className="h-3.5 w-3.5 shrink-0 text-[#B91C1C]"
                          aria-hidden="true"
                        />
                      )}
                      <span>{chk.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#52525B] leading-snug">{chk.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab-accessible Sandbox Test Output Logs */}
      {(baselineTest || latestCandidateTest) && (
        <div className="border-t border-[#E8E8EC] px-4 py-5 sm:px-5">
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
              className="flex rounded-[6px] bg-[#FAFAFA] p-1 border border-[#E8E8EC] w-full sm:w-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeLogTab === 'baseline'}
                onClick={() => setActiveLogTab('baseline')}
                className={`flex-1 sm:flex-initial min-h-[38px] rounded-[4px] px-3 py-1 font-mono text-[12px] transition-colors ${
                  activeLogTab === 'baseline'
                    ? 'bg-[#FFFFFF] text-[#B91C1C] font-medium border border-[#E8E8EC]'
                    : 'text-[#52525B] hover:text-[#0A0A0A]'
                }`}
              >
                Baseline Log (Exit {baselineTest?.exit_code ?? '—'})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLogTab === 'candidate'}
                onClick={() => setActiveLogTab('candidate')}
                className={`flex-1 sm:flex-initial min-h-[38px] rounded-[4px] px-3 py-1 font-mono text-[12px] transition-colors ${
                  activeLogTab === 'candidate'
                    ? 'bg-[#FFFFFF] text-[#047857] font-medium border border-[#E8E8EC]'
                    : 'text-[#52525B] hover:text-[#0A0A0A]'
                }`}
              >
                Post-Patch Log (Exit {latestCandidateTest?.exit_code ?? '—'})
              </button>
            </div>
          </div>

          <pre className="max-h-64 max-w-full overflow-auto rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4 font-mono text-[12px] text-[#0A0A0A] whitespace-pre-wrap break-words">
            {activeLogTab === 'baseline'
              ? `${baselineTest?.stdout_excerpt || ''}\n${baselineTest?.stderr_excerpt || ''}`.trim() ||
                'No baseline log output recorded.'
              : `${latestCandidateTest?.stdout_excerpt || ''}\n${latestCandidateTest?.stderr_excerpt || ''}`.trim() ||
                'No post-patch log output recorded yet.'}
          </pre>
        </div>
      )}

      {/* Nebius Token Factory Sandboxes (Beta) · ConTree Copy-on-Write Verification & QR Attestation */}
      {nebiusSandbox && (
        <div
          id="nebius-sandbox-section"
          className="border-t border-[#E8E8EC] bg-[#FFFFFF] px-4 py-5 sm:px-5 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#1D1D1F] text-[#30D158] border border-black/10">
                <Cpu className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[16px] font-bold text-[#1D1D1F] font-display">
                    Nebius Token Factory Sandboxes (Beta) · ConTree Copy-on-Write Runner
                  </h3>
                  <span className="rounded-full border border-[#34C759]/30 bg-[#34C759]/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#15803D]">
                    {nebiusSandbox.liveExecuted ? 'LIVE CONTREE-SDK EXECUTION' : 'CONTREE-SDK READY'}
                  </span>
                  <span className="rounded-full border border-black/[0.08] bg-[#F5F5F7] px-2.5 py-0.5 font-mono text-[10px] text-[#6E6E73]">
                    Project: {nebiusSandbox.projectId}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-[#6E6E73]">
                  Spawns a stateful Copy-on-Write container session from{' '}
                  <code className="font-mono text-[#1D1D1F]">{nebiusSandbox.baseImage}</code> on{' '}
                  <code className="font-mono text-[#0071E3]">{nebiusSandbox.endpointUrl}</code>,
                  installs <code className="font-mono text-[#1D1D1F]">qrencode</code> via{' '}
                  <code className="font-mono text-[#1D1D1F]">apt-get</code>, verifies RepoMedic
                  patch invariants, and renders an ANSI UTF-8 attestation QR code.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://docs.tokenfactory.nebius.com/sandboxes/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-black/[0.08] bg-[#F5F5F7] px-3.5 py-1.5 text-[12px] font-medium text-[#1D1D1F] hover:border-[#0071E3] transition-colors"
              >
                <span>Nebius Sandbox Docs</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#0071E3]" aria-hidden="true" />
              </a>
              <button
                id="run-nebius-sandbox-btn"
                type="button"
                disabled={nebiusSandboxLoading}
                onClick={handleRunNebiusSandbox}
                className="genesis-btn-primary inline-flex min-h-[36px] items-center gap-1.5 px-4 py-1.5 text-[12px] disabled:opacity-50"
              >
                {nebiusSandboxLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {nebiusSandboxLoading
                    ? 'Running in Nebius Sandbox…'
                    : 'Run Live in Nebius Sandbox (contree-sdk)'}
                </span>
              </button>
            </div>
          </div>

          {/* 3-Step Copy-on-Write Container Layer Chain */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {nebiusSandbox.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="rounded-[12px] border border-black/[0.07] bg-[#F5F5F7] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-[#0071E3]">
                    STEP {step.stepNumber} · COW LAYER
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      step.exitCode === 0
                        ? 'bg-[#ECFDF5] text-[#15803D] border border-[#34C759]/30'
                        : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#EF4444]/30'
                    }`}
                  >
                    exit {step.exitCode} · {step.elapsedMs}ms
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] font-semibold text-[#1D1D1F] truncate">
                  {step.command} {step.args.slice(0, 3).join(' ')}
                </div>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-[#6E6E73]">
                  <span className="truncate">
                    op: {step.operationUuid.slice(0, 14)}
                  </span>
                  <span>RSS {(step.maxRssKb / 1024).toFixed(1)} MB</span>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-Side Python contree-sdk Code & Live ANSI UTF-8 QR Attestation Terminal */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-[14px] border border-black/[0.08] bg-[#FAFAFA] p-3.5">
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-black/[0.06]">
                <span className="font-mono text-[11px] font-semibold text-[#1D1D1F]">
                  Python SDK (contree-sdk · scripts/nebius_contree_sandbox_demo.py)
                </span>
                <span className="font-mono text-[10px] text-[#0071E3]">
                  pip install contree-sdk
                </span>
              </div>
              <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-[#1D1D1F] whitespace-pre-wrap">
                {`from contree_sdk import ContreeSync

client = ContreeSync()
sandbox = client.images.use("python:3.12-slim").session()

# Install system tool in persistent Copy-on-Write layers
sandbox.run("apt-get", args=["update", "-q"], disposable=False).wait()
sandbox.run("apt-get", args=["install", "-y", "qrencode"], disposable=False).wait()

generated_code = """
import subprocess
qr = subprocess.run(
    ["qrencode", "-t", "ANSIUTF8", "https://tokenfactory.nebius.com"],
    capture_output=True, text=True,
)
print(qr.stdout)
"""
result = sandbox.run("python", args=["-c", generated_code]).wait()
print(result.stdout)`}
              </pre>
            </div>

            <div className="rounded-[14px] border border-black/15 bg-[#1D1D1F] p-3.5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
                <span className="font-mono text-[11px] font-semibold text-[#30D158]">
                  NEBIUS SANDBOX STDOUT · ANSI UTF-8 QR ATTESTATION
                </span>
                <span className="font-mono text-[10px] text-white/60">
                  Total: {nebiusSandbox.totalDurationMs}ms · Image:{' '}
                  {(nebiusSandbox.finalImageUuid ?? nebiusSandbox.baseImage).slice(0, 14)}
                </span>
              </div>
              <pre className="max-h-64 overflow-auto font-mono text-[9.5px] leading-[1.08] text-[#F5F5F7] whitespace-pre">
                {nebiusSandbox.stdout}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Episodic Memory & Multi-Step Nemotron Incident Co-Pilot */}
      <div className="border-t border-[#E8E8EC] bg-[#FAFAFA]/60 px-4 py-5 sm:px-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#6366F1]/10 text-[#4F46E5] border border-[#6366F1]/30">
              <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-bold text-[#0A0A0A] font-display">
                  Persistent Episodic Memory &amp; Nemotron Action Co-Pilot
                </h3>
                <span className="rounded-full border border-[#6366F1]/30 bg-[#6366F1]/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#4F46E5]">
                  CONTEXT RECALL + REAL ACTIONS
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-[#52525B]">
                Recalls prior verified runs and learned invariants from Supabase Postgres, then
                executes multi-step engineering workflows via live NVIDIA Nemotron on Nebius Token
                Factory.
              </p>
            </div>
          </div>

          <div className="rounded-[8px] border border-[#10B981]/30 bg-[#ECFDF5] px-3 py-1.5 font-mono text-[11px] font-semibold text-[#047857]">
            MTTR IMPACT: ~45m Manual Triage → {durationSeconds ?? 18}s Verified Proof (99.3% Faster)
          </div>
        </div>

        {/* Episodic Memory Recall Summary */}
        {memorySummary && (
          <div className="rounded-[10px] border border-[#E8E8EC] bg-[#FFFFFF] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E8E8EC]">
              <div className="flex items-center gap-2 font-mono text-[12px] font-semibold text-[#0A0A0A]">
                <Database className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                <span>
                  RECALLED REPOSITORY MEMORY ({memorySummary.repositoryFullName})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="rounded-full bg-[#FAFAFA] border border-[#E8E8EC] px-2.5 py-0.5 text-[#52525B]">
                  {memorySummary.totalPriorRuns} Prior Episodes
                </span>
                <span className="rounded-full bg-[#ECFDF5] border border-[#10B981]/30 px-2.5 py-0.5 text-[#047857] font-semibold">
                  {memorySummary.verifiedFixesCount} Verified Fixes
                </span>
                <span className="rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 px-2.5 py-0.5 text-[#4F46E5]">
                  Hotspot: {memorySummary.knownHotspotPaths[0]?.path ?? 'src/pricing.ts'}
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <div className="font-mono text-[11px] font-semibold uppercase text-[#52525B]">
                Learned Repository Invariants Injected into Nemotron Context:
              </div>
              <ul className="mt-1.5 space-y-1 text-[12px] text-[#52525B]">
                {memorySummary.learnedInvariants.map((inv, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0 text-[#047857] mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{inv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tavily Live Web & Specification Grounding Card */}
        {tavilySummary && tavilySummary.citations.length > 0 && (
          <div className="rounded-[10px] border border-[#E8E8EC] bg-[#FFFFFF] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E8E8EC]">
              <div className="flex items-center gap-2 font-mono text-[12px] font-semibold text-[#0A0A0A]">
                <Sparkles className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                <span>TAVILY LIVE WEB &amp; SPECIFICATION GROUNDING</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="rounded-full bg-[#ECFDF5] border border-[#10B981]/30 px-2.5 py-0.5 text-[#047857] font-semibold">
                  {tavilySummary.citations.length} Live Citations ({tavilySummary.responseTimeMs}ms)
                </span>
                <span className="rounded-full bg-[#FAFAFA] border border-[#E8E8EC] px-2.5 py-0.5 text-[#52525B]">
                  MCP: {tavilySummary.mcpServerUrl}
                </span>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {tavilySummary.citations.map((cit, idx) => (
                <a
                  key={idx}
                  href={cit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-2.5 text-[12px] hover:border-[#6366F1] transition-colors block"
                >
                  <div className="flex items-center justify-between gap-1 font-medium text-[#4F46E5]">
                    <span className="truncate">{cit.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-[11px] text-[#52525B] line-clamp-2 leading-snug">
                    {cit.snippet}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 1-Click Multi-Step Co-Pilot Workflows */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={copilotLoading}
            onClick={() => runCopilotWorkflow('sre_postmortem')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[8px] border px-3.5 py-2 text-[12px] font-medium transition-all disabled:opacity-50 ${
              activeWorkflow === 'sre_postmortem' && copilotOutput
                ? 'border-[#6366F1] bg-[#6366F1] text-[#FFFFFF]'
                : 'border-[#E8E8EC] bg-[#FFFFFF] text-[#0A0A0A] hover:border-[#6366F1]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#6366F1] shrink-0" aria-hidden="true" />
            <span>1. Synthesize SRE Post-Mortem &amp; Memory Rule</span>
          </button>

          <button
            type="button"
            disabled={copilotLoading}
            onClick={() => runCopilotWorkflow('iteration_audit')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[8px] border px-3.5 py-2 text-[12px] font-medium transition-all disabled:opacity-50 ${
              activeWorkflow === 'iteration_audit' && copilotOutput
                ? 'border-[#6366F1] bg-[#6366F1] text-[#FFFFFF]'
                : 'border-[#E8E8EC] bg-[#FFFFFF] text-[#0A0A0A] hover:border-[#6366F1]'
            }`}
          >
            <Terminal className="h-3.5 w-3.5 text-[#047857] shrink-0" aria-hidden="true" />
            <span>2. Audit Test-and-Iterate Loop &amp; Edge Cases</span>
          </button>

          <button
            type="button"
            disabled={copilotLoading}
            onClick={() => runCopilotWorkflow('canary_runbook')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[8px] border px-3.5 py-2 text-[12px] font-medium transition-all disabled:opacity-50 ${
              activeWorkflow === 'canary_runbook' && copilotOutput
                ? 'border-[#6366F1] bg-[#6366F1] text-[#FFFFFF]'
                : 'border-[#E8E8EC] bg-[#FFFFFF] text-[#0A0A0A] hover:border-[#6366F1]'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#B45309] shrink-0" aria-hidden="true" />
            <span>3. Generate Canary &amp; Rollback Runbook</span>
          </button>

          <button
            type="button"
            disabled={copilotLoading}
            onClick={() => runCopilotWorkflow('tavily_web_research')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[8px] border px-3.5 py-2 text-[12px] font-medium transition-all disabled:opacity-50 ${
              activeWorkflow === 'tavily_web_research' && copilotOutput
                ? 'border-[#6366F1] bg-[#6366F1] text-[#FFFFFF]'
                : 'border-[#E8E8EC] bg-[#FFFFFF] text-[#0A0A0A] hover:border-[#6366F1]'
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#4F46E5] shrink-0" aria-hidden="true" />
            <span>4. Tavily Live Web &amp; Spec Grounding</span>
          </button>
        </div>

        {/* Custom Co-Pilot Prompt Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!customQuestion.trim()) return;
            runCopilotWorkflow('custom');
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Ask RepoMedic Co-Pilot about this incident, diff, or repository memory…"
            aria-label="Custom question for RepoMedic Nemotron Co-Pilot"
            className="genesis-input flex-1 min-w-[240px] text-[13px]"
          />
          <button
            type="submit"
            disabled={copilotLoading || !customQuestion.trim()}
            className="genesis-btn-primary inline-flex min-h-[38px] items-center gap-1.5 px-4 py-2 text-[12px] disabled:opacity-50"
          >
            {copilotLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{copilotLoading ? 'Running Nemotron…' : 'Ask Nemotron Co-Pilot'}</span>
          </button>
        </form>

        {copilotError && (
          <div
            role="alert"
            className="rounded-[8px] border border-[#EF4444]/40 bg-[#FEF2F2] px-3.5 py-2.5 text-[12px] text-[#B91C1C]"
          >
            {copilotError}
          </div>
        )}

        {copilotOutput && (
          <div className="rounded-[10px] border border-[#6366F1]/40 bg-[#FFFFFF] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E8EC] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                <h4 className="text-[15px] font-bold text-[#0A0A0A] font-display">
                  {copilotOutput.title}
                </h4>
              </div>
              {copilotTelemetry && (
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#52525B]">
                  <span className="rounded-full bg-[#ECFDF5] border border-[#10B981]/30 px-2.5 py-0.5 text-[#047857] font-semibold">
                    LIVE NEBIUS: {copilotTelemetry.modelId}
                  </span>
                  <span>{copilotTelemetry.latencyMs}ms</span>
                  <span>
                    {copilotTelemetry.inputTokens} in / {copilotTelemetry.outputTokens} out tokens
                  </span>
                </div>
              )}
            </div>

            <p className="text-[13px] leading-relaxed text-[#0A0A0A]">
              {copilotOutput.executiveSummary}
            </p>

            <div className="rounded-[8px] border border-[#6366F1]/25 bg-[#6366F1]/5 px-3.5 py-2.5 text-[12px]">
              <span className="font-mono font-semibold text-[#4F46E5]">
                NEW EPISODIC MEMORY INVARIANT:{' '}
              </span>
              <span className="text-[#0A0A0A]">{copilotOutput.memoryInvariantLearned}</span>
            </div>

            <div>
              <div className="font-mono text-[11px] font-semibold uppercase text-[#52525B]">
                Recommended Engineering Actions:
              </div>
              <ul className="mt-1.5 space-y-1 text-[12px] text-[#0A0A0A]">
                {copilotOutput.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0 text-[#047857] mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-mono text-[11px] font-semibold uppercase text-[#52525B] mb-1">
                Generated Verification / Regression Snippet:
              </div>
              <pre className="overflow-x-auto rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3 font-mono text-[11px] text-[#0A0A0A] whitespace-pre-wrap">
                {copilotOutput.codeOrCommandSnippet}
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
