'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  GitPullRequestDraft,
  LogIn,
  PlusCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import type { IncidentRow, RunRow } from '@/lib/supabase/types';

interface IncidentWithRuns extends IncidentRow {
  runs: RunRow[];
}

export default function AppDashboardPage() {
  const [incidents, setIncidents] = useState<IncidentWithRuns[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/incidents', { cache: 'no-store' });
      if (res.status === 401) {
        setUnauthenticated(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to load incidents');
      }
      setIncidents(data.incidents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1017] text-[#F2F7FB]">
      <NavHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#9EB0C1]/15 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#F2F7FB]">Incident Investigation Runs</h1>
            <p className="mt-1 text-xs sm:text-sm text-[#9EB0C1]">
              Owner-scoped runs persisted in Supabase Postgres with Row-Level Security.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#9EB0C1]/25 bg-[#111923] px-3.5 py-2 text-xs font-medium text-[#F2F7FB] hover:border-[#28C8DB]/50"
            >
              <span>Recorded Case Study</span>
            </Link>
            <Link
              href="/app/incidents/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#28C8DB] px-4 py-2 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] transition-colors"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>New Incident Investigation</span>
            </Link>
          </div>
        </div>

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#9EB0C1]/15 bg-[#111923] p-12 text-center"
          >
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#28C8DB]" aria-hidden="true" />
            <p className="mt-3 text-sm text-[#9EB0C1]">Loading your investigation history…</p>
          </div>
        )}

        {!loading && unauthenticated && (
          <div className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-8 text-center max-w-xl mx-auto">
            <h2 className="text-lg font-semibold text-[#F2F7FB]">
              Sign in required for private live runs
            </h2>
            <p className="mt-2 text-xs text-[#9EB0C1] leading-relaxed">
              Live investigations invoke Nebius Token Factory and isolated Vercel Sandboxes under
              your authenticated Supabase session. Guests can inspect the recorded case study at
              any time without signing in.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-[#28C8DB] px-4 py-2 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D]"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign In or Create Account</span>
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-4 py-2 text-xs font-medium text-[#F2F7FB]"
              >
                <span>View Recorded Case Study</span>
              </Link>
            </div>
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

        {!loading && !unauthenticated && incidents.length === 0 && (
          <div className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-[#28C8DB]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-[#F2F7FB]">
              No live incidents investigated yet
            </h2>
            <p className="mt-1 text-xs text-[#9EB0C1]">
              Start your first closed-loop investigation on the allowlisted fixture repository.
            </p>
            <Link
              href="/app/incidents/new"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#28C8DB] px-4 py-2 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D]"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Start First Investigation</span>
            </Link>
          </div>
        )}

        {!loading && !unauthenticated && incidents.length > 0 && (
          <div className="space-y-3">
            {incidents.map((inc) => {
              const latestRun = inc.runs?.[0] ?? null;
              const status = latestRun?.status ?? 'queued';
              const isVerified = status === 'verified' || status === 'draft_pr_created';
              const isFailed = status === 'failed' || status === 'unverified';

              return (
                <div
                  key={inc.id}
                  className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-5 hover:border-[#28C8DB]/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#21BD9D]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#21BD9D] border border-[#21BD9D]/30">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F43F5E]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#F43F5E] border border-[#F43F5E]/30">
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#F59E0B] border border-[#F59E0B]/30">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        )}
                        <span className="font-mono text-xs text-[#28C8DB]">
                          {inc.repository_full_name} @ {inc.base_sha.slice(0, 10)}
                        </span>
                        <span className="font-mono text-xs text-[#9EB0C1]">
                          · {new Date(inc.created_at).toLocaleString()}
                        </span>
                      </div>

                      <h2 className="text-base font-semibold text-[#F2F7FB]">{inc.title}</h2>
                      {latestRun?.last_error && (
                        <p className="text-xs text-[#F43F5E] font-mono">
                          Note: {latestRun.last_error}
                        </p>
                      )}
                    </div>

                    {latestRun && (
                      <div className="flex items-center gap-2">
                        {isVerified && (
                          <Link
                            href={`/app/incidents/${latestRun.id}/review`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#21BD9D]/40 bg-[#21BD9D]/10 px-3 py-1.5 text-xs font-semibold text-[#21BD9D] hover:bg-[#21BD9D]/20"
                          >
                            <GitPullRequestDraft className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Review Diff &amp; PR</span>
                          </Link>
                        )}
                        <Link
                          href={`/app/incidents/${latestRun.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#182331] border border-[#9EB0C1]/25 px-3.5 py-1.5 text-xs font-semibold text-[#F2F7FB] hover:border-[#28C8DB]"
                        >
                          <span>Inspect Run</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
