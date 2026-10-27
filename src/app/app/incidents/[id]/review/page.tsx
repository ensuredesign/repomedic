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
    <div className="min-h-screen flex flex-col bg-[#0B1017] text-[#F2F7FB]">
      <NavHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#9EB0C1]/15 pb-5">
          <div>
            <Link
              href={`/app/incidents/${runId}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#28C8DB] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Investigation Timeline</span>
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-[#F2F7FB]">
              Human Approval Gate — Create GitHub Draft PR
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#9EB0C1]">
              Review the exact unified diff, SHA-256 fingerprint, and isolated test evidence before
              authorizing a draft pull request on the allowlisted repository.
            </p>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-[#9EB0C1]/15 bg-[#111923] p-12 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#28C8DB]" aria-hidden="true" />
            <p className="mt-3 text-sm text-[#9EB0C1]">Loading verified patch artifact…</p>
          </div>
        )}

        {bundle && latestPatch && (
          <div className="space-y-6">
            {/* Verification summary strip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-4">
                <div className="font-mono text-xs text-[#9EB0C1]">TARGET REPOSITORY</div>
                <div className="mt-1 font-mono text-sm font-semibold text-[#F2F7FB]">
                  {bundle.incident.repository_full_name}
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#28C8DB]">
                  Base SHA: {bundle.incident.base_sha.slice(0, 14)}
                </div>
              </div>

              <div className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-4">
                <div className="font-mono text-xs text-[#9EB0C1]">BEFORE / AFTER EXIT CODES</div>
                <div className="mt-1 font-mono text-sm font-semibold">
                  <span className="text-[#F43F5E]">
                    Baseline: Exit {baselineTest?.exit_code ?? '—'}
                  </span>{' '}
                  →{' '}
                  <span className="text-[#21BD9D]">
                    Patched: Exit {candidateTest?.exit_code ?? '—'}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#9EB0C1]">
                  Command: {candidateTest?.command ?? 'npx vitest run'}
                </div>
              </div>

              <div className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-4">
                <div className="font-mono text-xs text-[#9EB0C1]">PATCH SHA-256 FINGERPRINT</div>
                <div
                  className="mt-1 font-mono text-xs font-semibold text-[#28C8DB] break-all"
                  title={latestPatch.diff_sha256}
                >
                  {latestPatch.diff_sha256}
                </div>
              </div>
            </div>

            {/* Diff & Rationale Card */}
            <section className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-[#F2F7FB]">
                    Changed Files: {latestPatch.touched_paths.join(', ')}
                  </h2>
                  <p className="text-xs text-[#9EB0C1] mt-0.5">{latestPatch.rationale}</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportPatch}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-3 py-1.5 text-xs font-medium text-[#F2F7FB] hover:border-[#28C8DB]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Download .patch File</span>
                </button>
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
                <div className="rounded-lg border border-[#9EB0C1]/15 bg-[#0B1017] p-3 text-xs text-[#9EB0C1]">
                  <strong className="text-[#F2F7FB]">Risk &amp; Review Notes:</strong>{' '}
                  {latestPatch.risk_notes}
                </div>
              )}
            </section>

            {/* Approval Form or Created PR Confirmation */}
            {createdPr ? (
              <div className="rounded-xl border border-[#21BD9D]/40 bg-[#21BD9D]/10 p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-[#21BD9D] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="text-base font-bold text-[#F2F7FB]">
                      Draft Pull Request #{createdPr.github_pr_number} Created
                    </h2>
                    <p className="text-xs text-[#9EB0C1] mt-1 font-mono">
                      Branch: {createdPr.branch_name} · Draft status enforced (no auto-merge)
                    </p>
                  </div>
                </div>
                <a
                  href={createdPr.github_pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#21BD9D] px-4 py-2.5 text-xs font-semibold text-[#0B1017] hover:bg-[#28C8DB] transition-colors"
                >
                  <GitPullRequestDraft className="h-4 w-4" aria-hidden="true" />
                  <span>Open Draft PR on GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            ) : (
              <form
                onSubmit={handleApproveAndCreateDraftPr}
                className="rounded-xl border border-[#28C8DB]/30 bg-[#111923] p-6 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-[#28C8DB] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="text-base font-semibold text-[#F2F7FB]">
                      Explicit Human Approval of Diff Hash
                    </h2>
                    <p className="text-xs text-[#9EB0C1] mt-0.5">
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

                <label className="flex items-start gap-3 rounded-lg border border-[#9EB0C1]/20 bg-[#0B1017] p-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[#9EB0C1]/40 accent-[#28C8DB]"
                  />
                  <span className="text-xs text-[#F2F7FB] leading-relaxed">
                    I have reviewed the unified diff (<code className="font-mono text-[#28C8DB]">sha256:{latestPatch.diff_sha256.slice(0, 16)}…</code>)
                    and isolated sandbox test logs, and I authorize creating a{' '}
                    <strong>draft pull request</strong> in{' '}
                    <code className="font-mono">{bundle.incident.repository_full_name}</code>. I
                    understand human review is required before merging.
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#F43F5E]/40 bg-[#F43F5E]/10 p-3.5 text-xs text-[#F43F5E] flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <div>{error}</div>
                      <div className="text-[#9EB0C1]">
                        You can still export the verified <code className="font-mono">.patch</code>{' '}
                        file using the Download button above.
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#9EB0C1]">
                    <ShieldAlert className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
                    <span>Idempotent: duplicate clicks will never create duplicate PRs.</span>
                  </span>

                  <button
                    type="submit"
                    disabled={!confirmed || submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#28C8DB] px-5 py-2.5 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] disabled:opacity-50 transition-colors"
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
