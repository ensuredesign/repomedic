'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GitPullRequestDraft,
  PauseCircle,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import { ProofOfFixPanel } from '@/components/proof-of-fix-panel';
import type { CompleteRunBundle, RunStatus } from '@/lib/supabase/types';

const TERMINAL_STATUSES: RunStatus[] = [
  'verified',
  'unverified',
  'failed',
  'awaiting_approval',
  'draft_pr_created',
];

const ORDERED_STAGES = [
  { key: 'fetching', label: '1. Pin & Fetch Repo' },
  { key: 'baseline_running', label: '2. Isolated Baseline Test' },
  { key: 'investigating', label: '3. Nemotron Diagnosis' },
  { key: 'patch_generating', label: '4. Candidate Patch' },
  { key: 'patch_testing', label: '5. Sandbox Verification' },
  { key: 'verified', label: '6. Proof & PR Gate' },
];

export default function IncidentRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: runId } = use(params);
  const [bundle, setBundle] = useState<CompleteRunBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [pausedByReload, setPausedByReload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadRef = useRef(true);

  const fetchRunBundle = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${runId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to load run');
      }
      const fetchedBundle = data.bundle as CompleteRunBundle;
      setBundle(fetchedBundle);

      if (
        initialLoadRef.current &&
        !TERMINAL_STATUSES.includes(fetchedBundle.run.status) &&
        fetchedBundle.events.length > 1
      ) {
        // Honest resumable disclosure per PRD section 8:
        // If user reloaded or re-opened an in-progress run, show Paused — Resume Run option
        setPausedByReload(true);
      }
      initialLoadRef.current = false;
      return fetchedBundle;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load run details');
      return null;
    } finally {
      setLoading(false);
    }
  }, [runId]);

  const triggerAdvanceStep = useCallback(async () => {
    if (advancing) return;
    setAdvancing(true);
    setPausedByReload(false);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${runId}/advance`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to advance run stage');
      }
      await fetchRunBundle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error advancing run stage');
      setAutoAdvanceEnabled(false);
    } finally {
      setAdvancing(false);
    }
  }, [advancing, fetchRunBundle, runId]);

  useEffect(() => {
    fetchRunBundle();
  }, [fetchRunBundle]);

  useEffect(() => {
    if (!bundle) return;
    if (TERMINAL_STATUSES.includes(bundle.run.status)) return;
    if (!autoAdvanceEnabled || advancing || pausedByReload) return;

    const timer = setTimeout(() => {
      triggerAdvanceStep();
    }, 600);

    return () => clearTimeout(timer);
  }, [advancing, autoAdvanceEnabled, bundle, pausedByReload, triggerAdvanceStep]);

  const isTerminal = bundle ? TERMINAL_STATUSES.includes(bundle.run.status) : false;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1017] text-[#F2F7FB]">
      <NavHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Sticky status bar */}
        {bundle && (
          <div className="sticky top-16 z-30 rounded-xl border border-[#9EB0C1]/25 bg-[#182331]/95 backdrop-blur-md p-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#28C8DB] font-semibold">
                    RUN {bundle.run.id.slice(0, 8)}
                  </span>
                  <span className="rounded-full border border-[#9EB0C1]/30 bg-[#0B1017] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#F2F7FB]">
                    STATUS: {bundle.run.status.toUpperCase()}
                  </span>
                  {advancing && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#28C8DB]">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Executing stage: {bundle.run.current_stage}…</span>
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-base sm:text-lg font-bold text-[#F2F7FB]">
                  {bundle.incident.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isTerminal && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoAdvanceEnabled(true);
                        triggerAdvanceStep();
                      }}
                      disabled={advancing}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#28C8DB] px-3.5 py-2 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {pausedByReload
                          ? 'Resume Run'
                          : advancing
                            ? 'Advancing Stage…'
                            : 'Advance Next Stage'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoAdvanceEnabled((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#9EB0C1]/25 bg-[#111923] px-3 py-2 text-xs font-medium text-[#9EB0C1] hover:text-[#F2F7FB]"
                    >
                      <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{autoAdvanceEnabled ? 'Pause Auto-Step' : 'Enable Auto-Step'}</span>
                    </button>
                  </>
                )}

                {bundle.run.status === 'verified' && (
                  <Link
                    href={`/app/incidents/${bundle.run.id}/review`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#21BD9D] px-4 py-2 text-xs font-semibold text-[#0B1017] hover:bg-[#28C8DB] transition-colors"
                  >
                    <GitPullRequestDraft className="h-4 w-4" aria-hidden="true" />
                    <span>Review Diff &amp; Approve Draft PR</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Stage progress pills */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
              {ORDERED_STAGES.map((st) => {
                const completedEvents = bundle.events.some((e) => e.stage === st.key);
                const isCurrent = bundle.run.current_stage === st.key && !isTerminal;
                return (
                  <div
                    key={st.key}
                    className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] flex items-center gap-1.5 ${
                      isCurrent
                        ? 'border-[#28C8DB] bg-[#28C8DB]/15 text-[#28C8DB] font-semibold'
                        : completedEvents
                          ? 'border-[#21BD9D]/40 bg-[#21BD9D]/10 text-[#21BD9D]'
                          : 'border-[#9EB0C1]/15 bg-[#0B1017]/60 text-[#9EB0C1]'
                    }`}
                  >
                    {completedEvents ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    ) : isCurrent ? (
                      <RefreshCw className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
                    ) : (
                      <Clock className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
                    )}
                    <span className="truncate">{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pausedByReload && !isTerminal && (
          <div
            role="status"
            className="rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-4 text-xs text-[#F59E0B] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2.5">
              <PauseCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>
                <strong>Paused — Resume Run:</strong> RepoMedic uses bounded, idempotent server
                stages rather than hidden background promises. Click &ldquo;Resume Run&rdquo; to
                continue from stage <code className="font-mono">{bundle?.run.current_stage}</code>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPausedByReload(false);
                setAutoAdvanceEnabled(true);
                triggerAdvanceStep();
              }}
              className="rounded-lg bg-[#F59E0B] px-3 py-1.5 font-semibold text-[#0B1017] shrink-0"
            >
              Resume Now
            </button>
          </div>
        )}

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#9EB0C1]/15 bg-[#111923] p-12 text-center"
          >
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#28C8DB]" aria-hidden="true" />
            <p className="mt-3 text-sm text-[#9EB0C1]">Loading live investigation telemetry…</p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#F43F5E]/40 bg-[#111923] p-4 text-xs text-[#F43F5E] flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {bundle && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left rail: Incident + Persisted Event Log */}
            <div className="lg:col-span-4 space-y-6">
              <section className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-5">
                <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#9EB0C1]">
                  Persisted Stage Event Stream
                </h2>
                <ol className="mt-4 space-y-3">
                  {bundle.events.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-[#9EB0C1]/15 bg-[#0B1017] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-[#28C8DB]">
                          #{ev.seq} · {ev.stage}
                        </span>
                        <span className="font-mono text-[11px] text-[#9EB0C1]">
                          {new Date(ev.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-[#F2F7FB]/90 leading-relaxed">
                        {ev.summary}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              {bundle.run.last_error && (
                <section className="rounded-xl border border-[#F43F5E]/40 bg-[#F43F5E]/10 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F43F5E] font-mono">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    <span>DIAGNOSTIC / STAGE STOP REASON</span>
                  </div>
                  <p className="mt-2 text-xs text-[#F2F7FB] font-mono whitespace-pre-wrap">
                    {bundle.run.last_error}
                  </p>
                </section>
              )}
            </div>

            {/* Right main area: Proof of Fix Hero */}
            <div className="lg:col-span-8">
              <ProofOfFixPanel
                bundle={bundle}
                isRecordedDemo={bundle.run.is_demo}
                showReviewLink={true}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
