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
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] pb-5">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0A0A0A] font-display">
              Incident Investigation Runs
            </h1>
            <p className="mt-1 text-[14px] text-[#6B6B6B]">
              Owner-scoped runs persisted in Supabase Postgres with Row-Level Security.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="genesis-btn-secondary inline-flex h-[38px] items-center gap-1.5 px-4 text-[13px]"
            >
              <span>Recorded Case Study</span>
            </Link>
            <Link
              href="/app/incidents/new"
              className="genesis-btn-primary inline-flex h-[38px] items-center gap-1.5 px-4 text-[13px]"
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
            className="genesis-card p-12 text-center"
          >
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <p className="mt-3 text-[14px] text-[#6B6B6B]">Loading your investigation history…</p>
          </div>
        )}

        {!loading && unauthenticated && (
          <div className="genesis-card p-8 text-center max-w-xl mx-auto">
            <h2 className="text-[20px] font-bold text-[#0A0A0A] font-display">
              Sign in required for private live runs
            </h2>
            <p className="mt-2 text-[14px] text-[#6B6B6B] leading-relaxed">
              Live investigations invoke Nebius Token Factory and isolated Vercel Sandboxes under
              your authenticated Supabase session. Guests can inspect the recorded case study at
              any time without signing in.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth"
                className="genesis-btn-primary inline-flex h-[38px] items-center gap-2 px-4 text-[13px]"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign In or Create Account</span>
              </Link>
              <Link
                href="/demo"
                className="genesis-btn-secondary inline-flex h-[38px] items-center gap-2 px-4 text-[13px]"
              >
                <span>View Recorded Case Study</span>
              </Link>
            </div>
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

        {!loading && !unauthenticated && incidents.length === 0 && (
          <div className="genesis-card p-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-[#6366F1]" aria-hidden="true" />
            <h2 className="mt-3 text-[18px] font-bold text-[#0A0A0A] font-display">
              No live incidents investigated yet
            </h2>
            <p className="mt-1 text-[14px] text-[#6B6B6B]">
              Start your first closed-loop investigation on the allowlisted fixture repository.
            </p>
            <Link
              href="/app/incidents/new"
              className="genesis-btn-primary mt-5 inline-flex h-[38px] items-center gap-2 px-4 text-[13px]"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Start First Investigation</span>
            </Link>
          </div>
        )}

        {!loading && !unauthenticated && incidents.length > 0 && (
          <div className="space-y-4">
            {incidents.map((inc) => {
              const latestRun = inc.runs?.[0] ?? null;
              const status = latestRun?.status ?? 'queued';
              const isVerified = status === 'verified' || status === 'draft_pr_created';
              const isFailed = status === 'failed' || status === 'unverified';

              return (
                <div
                  key={inc.id}
                  className="genesis-card genesis-card-interactive p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-3 py-0.5 font-mono text-[11px] font-medium text-[#10B981] border border-[#10B981]/30">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444]/10 px-3 py-0.5 font-mono text-[11px] font-medium text-[#EF4444] border border-[#EF4444]/30">
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-3 py-0.5 font-mono text-[11px] font-medium text-[#F59E0B] border border-[#F59E0B]/30">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        )}
                        <span className="font-mono text-[12px] text-[#6366F1]">
                          {inc.repository_full_name} @ {inc.base_sha.slice(0, 10)}
                        </span>
                        <span className="font-mono text-[12px] text-[#9C9C9C]">
                          · {new Date(inc.created_at).toLocaleString()}
                        </span>
                      </div>

                      <h2 className="text-[17px] font-bold text-[#0A0A0A] font-display">
                        {inc.title}
                      </h2>
                      {latestRun?.last_error && (
                        <p className="text-[12px] text-[#EF4444] font-mono">
                          Note: {latestRun.last_error}
                        </p>
                      )}
                    </div>

                    {latestRun && (
                      <div className="flex items-center gap-2.5">
                        {isVerified && (
                          <Link
                            href={`/app/incidents/${latestRun.id}/review`}
                            className="inline-flex h-[32px] items-center gap-1.5 rounded-[6px] border border-[#10B981]/40 bg-[#10B981]/10 px-3 text-[13px] font-medium text-[#10B981] hover:-translate-y-[1px] transition-all"
                          >
                            <GitPullRequestDraft className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Review Diff &amp; PR</span>
                          </Link>
                        )}
                        <Link
                          href={`/app/incidents/${latestRun.id}`}
                          className="genesis-btn-secondary inline-flex h-[32px] items-center gap-1.5 px-3.5 text-[13px]"
                        >
                          <span>Inspect Run</span>
                          <ArrowRight className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
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
