'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  GitPullRequestDraft,
  Lock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import type { CompleteRunBundle, PullRequestRow } from '@/lib/supabase/types';

export default function ReviewAndApprovePrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: runId } = use(params);
  const [bundle, setBundle] = useState<CompleteRunBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdPr, setCreatedPr] = useState<PullRequestRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/runs/${runId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.bundle) {
          setBundle(d.bundle);
          if (d.bundle.pullRequest) {
            setCreatedPr(d.bundle.pullRequest);
          }
        } else {
          setError(d?.error?.message || 'Failed to load run for review');
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load run'))
      .finally(() => setLoading(false));
  }, [runId]);

  const latestPatch = bundle?.patches?.[bundle.patches.length - 1] ?? null;
  const baselineTest = bundle?.testResults?.find((t) => t.kind === 'baseline') ?? null;
  const candidateTest =
    bundle?.testResults?.filter((t) => t.kind === 'candidate').pop() ?? null;

  function handleExportPatch() {
    if (!latestPatch || !bundle) return;
    const blob = new Blob([latestPatch.unified_diff], { type: 'text/x-diff;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repomedic-${bundle.run.id.slice(0, 8)}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleApproveAndCreateDraftPr(e: React.FormEvent) {
    e.preventDefault();
    if (!latestPatch || !confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${runId}/approve-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patchId: latestPatch.id,
          approvedDiffSha256: latestPatch.diff_sha256,
          confirmedHumanReview: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to create draft PR');
      }
      setCreatedPr(data.pullRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft PR');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] pb-5">
          <div>
            <Link
              href={`/app/incidents/${runId}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-mono text-[#6366F1] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Investigation Timeline</span>
            </Link>
            <h1 className="mt-2 text-[28px] sm:text-[32px] font-bold text-[#0A0A0A] font-display">
              Human Approval Gate — Create GitHub Draft PR
            </h1>
            <p className="mt-1 text-[14px] text-[#6B6B6B]">
              Review the exact unified diff, SHA-256 fingerprint, and isolated test evidence before
              authorizing a draft pull request on the allowlisted repository.
            </p>
          </div>
        </div>

        {loading && (
          <div className="genesis-card p-12 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <p className="mt-3 text-[14px] text-[#6B6B6B]">Loading verified patch artifact…</p>
          </div>
        )}

        {bundle && latestPatch && (
          <div className="space-y-6">
            {/* Verification summary strip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="genesis-card p-4">
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#9C9C9C]">
                  TARGET REPOSITORY
                </div>
                <div className="mt-1 font-mono text-[14px] font-medium text-[#0A0A0A]">
                  {bundle.incident.repository_full_name}
                </div>
                <div className="mt-0.5 font-mono text-[12px] text-[#6366F1]">
                  Base SHA: {bundle.incident.base_sha.slice(0, 14)}
                </div>
              </div>

              <div className="genesis-card p-4">
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#9C9C9C]">
                  BEFORE / AFTER EXIT CODES
                </div>
                <div className="mt-1 font-mono text-[14px] font-medium">
                  <span className="text-[#EF4444]">
                    Baseline: Exit {baselineTest?.exit_code ?? '—'}
                  </span>{' '}
                  →{' '}
                  <span className="text-[#10B981]">
                    Patched: Exit {candidateTest?.exit_code ?? '—'}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[12px] text-[#6B6B6B]">
                  Command: {candidateTest?.command ?? 'npx vitest run'}
                </div>
              </div>

              <div className="genesis-card p-4">
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#9C9C9C]">
                  PATCH SHA-256 FINGERPRINT
                </div>
                <div
                  className="mt-1 font-mono text-[12px] font-medium text-[#0A0A0A] break-all"
                  title={latestPatch.diff_sha256}
                >
                  {latestPatch.diff_sha256}
                </div>
              </div>
            </div>

            {/* Diff & Rationale Card */}
            <section className="genesis-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[18px] font-bold text-[#0A0A0A] font-display">
                    Changed Files: {latestPatch.touched_paths.join(', ')}
                  </h2>
                  <p className="text-[13px] text-[#6B6B6B] mt-0.5">{latestPatch.rationale}</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportPatch}
                  className="genesis-btn-secondary inline-flex h-[32px] items-center gap-1.5 px-3 text-[13px]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Download .patch File</span>
                </button>
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
                <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5 text-[13px] text-[#6B6B6B]">
                  <strong className="text-[#0A0A0A]">Risk &amp; Review Notes:</strong>{' '}
                  {latestPatch.risk_notes}
                </div>
              )}
            </section>

            {/* Approval Form or Created PR Confirmation */}
            {createdPr ? (
              <div className="genesis-card border-[#10B981]/40 p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-[#10B981] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0A0A0A] font-display">
                      Draft Pull Request #{createdPr.github_pr_number} Created
                    </h2>
                    <p className="text-[13px] text-[#6B6B6B] mt-1 font-mono">
                      Branch: {createdPr.branch_name} · Draft status enforced (no auto-merge)
                    </p>
                  </div>
                </div>
                <a
                  href={createdPr.github_pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="genesis-btn-primary inline-flex h-[38px] items-center gap-2 px-4 text-[13px]"
                >
                  <GitPullRequestDraft className="h-4 w-4" aria-hidden="true" />
                  <span>Open Draft PR on GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            ) : (
              <form
                onSubmit={handleApproveAndCreateDraftPr}
                className="genesis-card p-6 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-[#6366F1] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0A0A0A] font-display">
                      Explicit Human Approval of Diff Hash
                    </h2>
                    <p className="text-[13px] text-[#6B6B6B] mt-0.5">
                      RepoMedic never allows the AI model to invoke GitHub write tools directly.
                      Approving records your user ID, timestamp, and exact patch SHA-256 in{' '}
                      <code className="font-mono">public.approvals</code> before opening a{' '}
                      <strong>draft</strong> pull request on branch{' '}
                      <code className="font-mono">
                        repomedic/fix-{bundle.run.id.replace(/-/g, '').slice(0, 10)}
                      </code>
                      .
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[#E8E8EC] accent-[#6366F1]"
                  />
                  <span className="text-[13px] text-[#0A0A0A] leading-relaxed">
                    I have reviewed the unified diff (<code className="font-mono text-[#6366F1]">sha256:{latestPatch.diff_sha256.slice(0, 16)}…</code>)
                    and isolated sandbox test logs, and I authorize creating a{' '}
                    <strong>draft pull request</strong> in{' '}
                    <code className="font-mono">{bundle.incident.repository_full_name}</code>. I
                    understand human review is required before merging.
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="rounded-[6px] border border-[#EF4444]/40 bg-[#EF4444]/10 p-3.5 text-[13px] text-[#EF4444] flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <div>{error}</div>
                      <div className="text-[#6B6B6B]">
                        You can still export the verified <code className="font-mono">.patch</code>{' '}
                        file using the Download button above.
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-[#6B6B6B]">
                    <ShieldAlert className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
                    <span>Idempotent: duplicate clicks will never create duplicate PRs.</span>
                  </span>

                  <button
                    type="submit"
                    disabled={!confirmed || submitting}
                    className="genesis-btn-primary inline-flex h-[38px] items-center gap-2 px-5 text-[13px] disabled:opacity-50"
                  >
                    <GitPullRequestDraft className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {submitting
                        ? 'Recording Approval & Creating Draft PR…'
                        : 'Approve Diff Hash & Create Draft PR'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
