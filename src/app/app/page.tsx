'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  GitPullRequestDraft,
  LogIn,
  PlusCircle,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import type { IncidentRow, RunRow } from '@/lib/supabase/types';

interface IncidentWithRuns extends IncidentRow {
  runs: RunRow[];
}

type RunFilterTab = 'all' | 'verified' | 'pr_created' | 'attention';

export default function AppDashboardPage() {
  const [incidents, setIncidents] = useState<IncidentWithRuns[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<RunFilterTab>('all');

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

  const verifiedCount = incidents.filter((inc) => {
    const st = inc.runs?.[0]?.status;
    return st === 'verified' || st === 'draft_pr_created';
  }).length;

  const prCreatedCount = incidents.filter(
    (inc) => inc.runs?.[0]?.status === 'draft_pr_created',
  ).length;

  const filteredIncidents = incidents.filter((inc) => {
    const status = inc.runs?.[0]?.status ?? 'queued';
    if (filterTab === 'verified') {
      return status === 'verified' || status === 'draft_pr_created';
    }
    if (filterTab === 'pr_created') {
      return status === 'draft_pr_created';
    }
    if (filterTab === 'attention') {
      return status !== 'verified' && status !== 'draft_pr_created';
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] pb-5">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0A0A0A] font-display">
              Incident Investigation Runs
            </h1>
            <p className="mt-1 text-[14px] text-[#52525B]">
              Owner-scoped runs persisted in Supabase Postgres with Row-Level Security.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/demo"
              className="genesis-btn-secondary inline-flex h-[38px] items-center gap-1.5 px-4 text-[13px]"
            >
              <span>Recorded Case Study</span>
            </Link>
            <Link
              href="/admin"
              className="genesis-btn-secondary inline-flex h-[38px] items-center gap-1.5 px-4 text-[13px]"
            >
              <Shield className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
              <span>Admin Panel</span>
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

        {/* Workspace Summary KPIs & Filter Tabs */}
        {!loading && !unauthenticated && incidents.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="genesis-card p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] font-semibold uppercase text-[#52525B]">
                    TOTAL INCIDENTS
                  </div>
                  <div className="mt-1 text-[24px] font-bold text-[#0A0A0A] font-display">
                    {incidents.length}
                  </div>
                </div>
                <Activity className="h-5 w-5 text-[#6366F1]" aria-hidden="true" />
              </div>

              <div className="genesis-card p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] font-semibold uppercase text-[#047857]">
                    VERIFIED SANDBOX FIXES
                  </div>
                  <div className="mt-1 text-[24px] font-bold text-[#047857] font-display">
                    {verifiedCount}
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-[#047857]" aria-hidden="true" />
              </div>

              <div className="genesis-card p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] font-semibold uppercase text-[#4F46E5]">
                    GATED DRAFT PRs CREATED
                  </div>
                  <div className="mt-1 text-[24px] font-bold text-[#0A0A0A] font-display">
                    {prCreatedCount}
                  </div>
                </div>
                <GitPullRequestDraft className="h-5 w-5 text-[#6366F1]" aria-hidden="true" />
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Filter Investigation Runs"
              className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[#E8E8EC] bg-[#FFFFFF] p-1.5"
            >
              <span className="inline-flex items-center gap-1.5 px-2.5 text-[12px] font-mono font-semibold text-[#52525B]">
                <Filter className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                <span>VIEW:</span>
              </span>
              {[
                { key: 'all' as const, label: `All Runs (${incidents.length})` },
                { key: 'verified' as const, label: `Verified Proofs (${verifiedCount})` },
                { key: 'pr_created' as const, label: `Draft PR Opened (${prCreatedCount})` },
                {
                  key: 'attention' as const,
                  label: `In Progress / Other (${incidents.length - verifiedCount})`,
                },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={filterTab === t.key}
                  onClick={() => setFilterTab(t.key)}
                  className={`rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                    filterTab === t.key
                      ? 'bg-[#6366F1] text-[#FFFFFF]'
                      : 'text-[#52525B] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div role="status" aria-live="polite" className="genesis-card p-12 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <p className="mt-3 text-[14px] text-[#52525B]">Loading your investigation history…</p>
          </div>
        )}

        {!loading && unauthenticated && (
          <div className="genesis-card p-8 text-center max-w-xl mx-auto">
            <h2 className="text-[20px] font-bold text-[#0A0A0A] font-display">
              Sign in required for private live runs
            </h2>
            <p className="mt-2 text-[14px] text-[#52525B] leading-relaxed">
              Live investigations invoke Nebius Token Factory and isolated Vercel Sandboxes under
              your authenticated Supabase session. Use the 1-Click Demo Login on the Sign In page to
              inspect verified runs immediately.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth"
                className="genesis-btn-primary inline-flex h-[38px] items-center gap-2 px-4 text-[13px]"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>1-Click Demo Login / Sign In</span>
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
            className="genesis-card border-[#EF4444]/40 p-4 text-[13px] text-[#B91C1C] flex items-center gap-2"
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
            <p className="mt-1 text-[14px] text-[#52525B]">
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

        {!loading && !unauthenticated && filteredIncidents.length > 0 && (
          <div className="space-y-4">
            {filteredIncidents.map((inc) => {
              const latestRun = inc.runs?.[0] ?? null;
              const status = latestRun?.status ?? 'queued';
              const isVerified = status === 'verified' || status === 'draft_pr_created';
              const isFailed = status === 'failed' || status === 'unverified';

              return (
                <div key={inc.id} className="genesis-card genesis-card-interactive p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-3 py-0.5 font-mono text-[11px] font-semibold text-[#047857] border border-[#10B981]/40">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-3 py-0.5 font-mono text-[11px] font-semibold text-[#B91C1C] border border-[#EF4444]/40">
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-3 py-0.5 font-mono text-[11px] font-semibold text-[#B45309] border border-[#F59E0B]/40">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>{status.toUpperCase()}</span>
                          </span>
                        )}
                        <span className="font-mono text-[12px] font-medium text-[#4F46E5]">
                          {inc.repository_full_name} @ {inc.base_sha.slice(0, 10)}
                        </span>
                        <span className="font-mono text-[12px] text-[#52525B]">
                          · {new Date(inc.created_at).toLocaleString()}
                        </span>
                      </div>

                      <h2 className="text-[17px] font-bold text-[#0A0A0A] font-display">
                        {inc.title}
                      </h2>
                      {latestRun?.last_error && (
                        <p className="text-[12px] text-[#B91C1C] font-mono">
                          Note: {latestRun.last_error}
                        </p>
                      )}
                    </div>

                    {latestRun && (
                      <div className="flex items-center gap-2.5">
                        {isVerified && (
                          <Link
                            href={`/app/incidents/${latestRun.id}/review`}
                            className="inline-flex h-[36px] items-center gap-1.5 rounded-[6px] border border-[#10B981]/40 bg-[#ECFDF5] px-3 text-[13px] font-medium text-[#047857] hover:-translate-y-[1px] transition-all"
                          >
                            <GitPullRequestDraft className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Review Diff &amp; PR</span>
                          </Link>
                        )}
                        <Link
                          href={`/app/incidents/${latestRun.id}`}
                          className="genesis-btn-secondary inline-flex h-[36px] items-center gap-1.5 px-3.5 text-[13px]"
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
