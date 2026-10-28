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
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 space-y-6">
        {/* Sticky status bar */}
        {bundle && (
          <div className="sticky top-16 z-30 genesis-card bg-[#FFFFFF]/95 backdrop-blur-md p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B6B6B] font-medium">
                    RUN {bundle.run.id.slice(0, 8)}
                  </span>
                  <span className="rounded-full border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-0.5 font-mono text-[11px] font-medium text-[#0A0A0A]">
                    STATUS: {bundle.run.status.toUpperCase()}
                  </span>
                  {advancing && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[#6366F1]">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Executing stage: {bundle.run.current_stage}…</span>
                    </span>
                  )}
                </div>
                <h1 className="mt-1.5 text-[20px] font-bold text-[#0A0A0A] font-display">
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
                      className="genesis-btn-primary inline-flex h-[38px] items-center gap-1.5 px-4 text-[13px] disabled:opacity-50"
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
                      className="genesis-btn-secondary inline-flex h-[38px] items-center gap-1.5 px-3.5 text-[13px]"
                    >
                      <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{autoAdvanceEnabled ? 'Pause Auto-Step' : 'Enable Auto-Step'}</span>
                    </button>
                  </>
                )}

                {bundle.run.status === 'verified' && (
                  <Link
                    href={`/app/incidents/${bundle.run.id}/review`}
                    className="genesis-btn-primary inline-flex h-[38px] items-center gap-1.5 px-4 text-[13px]"
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
                    className={`rounded-[6px] border px-2.5 py-1.5 font-mono text-[11px] flex items-center gap-1.5 ${
                      isCurrent
                        ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#6366F1] font-medium'
                        : completedEvents
                          ? 'border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]'
                          : 'border-[#E8E8EC] bg-[#FAFAFA] text-[#9C9C9C]'
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
            className="genesis-card border-[#F59E0B]/40 p-4 text-[13px] text-[#0A0A0A] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2.5">
              <PauseCircle className="h-5 w-5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
              <span>
                <strong>Paused — Resume Run:</strong> RepoMedic uses bounded, idempotent server
                stages rather than hidden background promises. Click &ldquo;Resume Run&rdquo; to
                continue from stage <code className="font-mono text-[#6366F1]">{bundle?.run.current_stage}</code>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPausedByReload(false);
                setAutoAdvanceEnabled(true);
                triggerAdvanceStep();
              }}
              className="genesis-btn-primary h-[32px] px-3 text-[12px] shrink-0"
            >
              Resume Now
            </button>
          </div>
        )}

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="genesis-card p-12 text-center"
          >
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <p className="mt-3 text-[14px] text-[#6B6B6B]">Loading live investigation telemetry…</p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="genesis-card border-[#EF4444]/40 p-4 text-[13px] text-[#EF4444] flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {bundle && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left rail: Incident + Persisted Event Log */}
            <div className="lg:col-span-4 space-y-6">
              <section className="genesis-card p-5">
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#9C9C9C]">
                  Persisted Stage Event Stream
                </h2>
                <ol className="mt-4 space-y-3">
                  {bundle.events.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] font-medium text-[#0A0A0A]">
                          #{ev.seq} · {ev.stage}
                        </span>
                        <span className="font-mono text-[11px] text-[#9C9C9C]">
                          {new Date(ev.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] text-[#6B6B6B] leading-relaxed">
                        {ev.summary}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              {bundle.run.last_error && (
                <section className="genesis-card border-[#EF4444]/40 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[#EF4444] font-mono">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    <span>DIAGNOSTIC / STAGE STOP REASON</span>
                  </div>
                  <p className="mt-2 text-[12px] text-[#0A0A0A] font-mono whitespace-pre-wrap">
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
