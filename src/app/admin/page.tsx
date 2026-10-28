'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  ExternalLink,
  GitPullRequestDraft,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ProfileRow, RunRow } from '@/lib/supabase/types';

interface AdminKpis {
  totalUsers: number;
  adminCount: number;
  totalIncidents: number;
  totalRuns: number;
  verifiedRunsCount: number;
  failedOrUnverifiedCount: number;
  draftPrsCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
}

interface AdminIntegrations {
  nebiusModel: string;
  nebiusConfigured: boolean;
  vercelSandboxConfigured: boolean;
  githubConfigured: boolean;
  allowedRepositories: string[];
  resendConfigured: boolean;
  resendFromEmail: string;
}

interface EnrichedAdminRun extends RunRow {
  incidentTitle: string;
  repositoryFullName: string;
  baseSha: string;
  ownerEmail: string;
  ownerName: string;
  pullRequestUrl: string | null;
  pullRequestNumber: number | null;
}

export default function AdminPanelPage() {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [switchingToAdmin, setSwitchingToAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [integrations, setIntegrations] = useState<AdminIntegrations | null>(null);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [runs, setRuns] = useState<EnrichedAdminRun[]>([]);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<string | null>(null);

  async function loadAdminOverview() {
    setLoading(true);
    setError(null);
    setAccessDenied(false);
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to load admin overview');
      }
      setKpis(data.kpis);
      setIntegrations(data.integrations);
      setUsers(data.users ?? []);
      setRuns(data.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin panel');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminOverview();
  }, []);

  async function handleSwitchToDemoAdmin() {
    setSwitchingToAdmin(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: 'admin@repomedic.dev',
        password: 'RepoMedicAdmin!2026',
      });
      if (signInErr) throw signInErr;
      await loadAdminOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch to Admin Demo account');
    } finally {
      setSwitchingToAdmin(false);
    }
  }

  async function handleToggleUserRole(targetUser: ProfileRow) {
    const nextRole = targetUser.role === 'admin' ? 'developer' : 'admin';
    setUpdatingUserId(targetUser.id);
    setRoleFeedback(null);
    try {
      const res = await fetch('/api/admin/overview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          role: nextRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to update role');
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? (data.profile as ProfileRow) : u)),
      );
      setRoleFeedback(`Updated ${targetUser.email || targetUser.display_name} to role: ${nextRole.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed');
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] pb-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4F46E5]">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Platform Governance · RBAC · System Telemetry</span>
            </div>
            <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold text-[#0A0A0A] font-display">
              RepoMedic Admin Control Plane
            </h1>
            <p className="mt-1 text-[14px] text-[#52525B]">
              Manage registered users &amp; RBAC roles, audit global Nebius Nemotron token usage, and
              inspect all isolated Vercel Sandbox runs and approval-gated Draft PRs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadAdminOverview}
              className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Refresh Telemetry</span>
            </button>
            <Link
              href="/app/profile"
              className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px]"
            >
              <span>My Profile</span>
            </Link>
          </div>
        </div>

        {loading && (
          <div role="status" aria-live="polite" className="genesis-card p-12 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <p className="mt-3 text-[14px] text-[#52525B]">
              Loading platform governance &amp; user directory…
            </p>
          </div>
        )}

        {!loading && accessDenied && (
          <div className="genesis-card border-[#6366F1]/40 p-8 text-center max-w-xl mx-auto space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#6366F1]/10 text-[#4F46E5]">
              <Lock className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-[22px] font-bold text-[#0A0A0A] font-display">
              Administrator Access Required
            </h2>
            <p className="text-[14px] text-[#52525B] leading-relaxed">
              The Admin Control Plane is protected by PostgreSQL Row-Level Security (`public.is_admin()`).
              For hackathon evaluation, click below to sign in to the pre-configured{' '}
              <strong className="text-[#0A0A0A]">Platform Admin Demo Account</strong> in one click.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                id="admin-one-click-switch"
                type="button"
                disabled={switchingToAdmin}
                onClick={handleSwitchToDemoAdmin}
                className="genesis-btn-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 text-[14px] disabled:opacity-50"
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span>
                  {switchingToAdmin
                    ? 'Signing in as Admin…'
                    : '1-Click Sign In as Admin (admin@repomedic.dev)'}
                </span>
              </button>
              <Link
                href="/auth"
                className="genesis-btn-secondary inline-flex min-h-[44px] items-center gap-2 px-4 py-2.5 text-[13px]"
              >
                <span>Open Login Page</span>
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="genesis-card border-[#EF4444]/40 bg-[#FEF2F2] p-4 text-[13px] text-[#B91C1C] flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {roleFeedback && (
          <div
            role="status"
            className="genesis-card border-[#10B981]/40 bg-[#ECFDF5] p-3.5 text-[13px] text-[#047857] flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{roleFeedback}</span>
          </div>
        )}

        {!loading && !accessDenied && kpis && integrations && (
          <>
            {/*KPI Strip*/}
            <section
              aria-label="Platform KPIs"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <div className="genesis-card p-5">
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase text-[#52525B]">
                  <span>REGISTERED USERS</span>
                  <Users className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                </div>
                <div className="mt-2 text-[28px] font-bold text-[#0A0A0A] font-display">
                  {kpis.totalUsers}
                </div>
                <div className="mt-1 text-[12px] text-[#52525B] font-mono">
                  {kpis.adminCount} Admin · {kpis.totalUsers - kpis.adminCount} Developer
                </div>
              </div>

              <div className="genesis-card p-5">
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase text-[#52525B]">
                  <span>TOTAL RUNS</span>
                  <Activity className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                </div>
                <div className="mt-2 text-[28px] font-bold text-[#0A0A0A] font-display">
                  {kpis.totalRuns}
                </div>
                <div className="mt-1 text-[12px] text-[#52525B] font-mono">
                  Across {kpis.totalIncidents} incidents
                </div>
              </div>

              <div className="genesis-card p-5">
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase text-[#047857]">
                  <span>VERIFIED PROOFS</span>
                  <CheckCircle2 className="h-4 w-4 text-[#047857]" aria-hidden="true" />
                </div>
                <div className="mt-2 text-[28px] font-bold text-[#047857] font-display">
                  {kpis.verifiedRunsCount}
                </div>
                <div className="mt-1 text-[12px] text-[#52525B] font-mono">
                  Red → Green in Vercel Sandbox
                </div>
              </div>

              <div className="genesis-card p-5">
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase text-[#52525B]">
                  <span>GATED DRAFT PRs</span>
                  <GitPullRequestDraft className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                </div>
                <div className="mt-2 text-[28px] font-bold text-[#0A0A0A] font-display">
                  {kpis.draftPrsCount}
                </div>
                <div className="mt-1 text-[12px] text-[#52525B] font-mono">
                  SHA-256 human-approved
                </div>
              </div>

              <div className="genesis-card p-5">
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase text-[#52525B]">
                  <span>NEMOTRON TOKENS</span>
                  <Cpu className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                </div>
                <div className="mt-2 text-[26px] font-bold text-[#0A0A0A] font-mono">
                  {kpis.totalTokens.toLocaleString()}
                </div>
                <div className="mt-1 text-[12px] text-[#52525B] font-mono">
                  Est. ${kpis.totalEstimatedCostUsd.toFixed(4)} USD
                </div>
              </div>
            </section>

            {/* Infrastructure & Security Governance Status */}
            <section className="genesis-card p-5">
              <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#52525B]">
                Live Infrastructure &amp; Security Guardrails
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[13px]">
                <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#047857] font-semibold">
                    <span>NEBIUS TOKEN FACTORY</span>
                    <span>ONLINE</span>
                  </div>
                  <p className="mt-1 font-mono text-[12px] font-medium text-[#0A0A0A] truncate">
                    {integrations.nebiusModel}
                  </p>
                </div>

                <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#047857] font-semibold">
                    <span>VERCEL SANDBOX RUNNER</span>
                    <span>ISOLATED VM</span>
                  </div>
                  <p className="mt-1 font-mono text-[12px] text-[#0A0A0A]">
                    Allowlist: {integrations.allowedRepositories.join(', ')}
                  </p>
                </div>

                <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#047857] font-semibold">
                    <span>SUPABASE POSTGRES + RLS</span>
                    <span>ENFORCED</span>
                  </div>
                  <p className="mt-1 font-mono text-[12px] text-[#0A0A0A]">
                    Owner &amp; Admin RBAC policies active
                  </p>
                </div>

                <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#047857] font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> RESEND EMAIL
                    </span>
                    <span>{integrations.resendConfigured ? 'ACTIVE' : 'OPTIONAL'}</span>
                  </div>
                  <p className="mt-1 font-mono text-[12px] text-[#0A0A0A] truncate">
                    {integrations.resendFromEmail}
                  </p>
                </div>
              </div>
            </section>

            {/* User & Role Management Directory */}
            <section className="genesis-card overflow-hidden">
              <div className="border-b border-[#E8E8EC] bg-[#FAFAFA] px-5 py-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[17px] font-bold text-[#0A0A0A] font-display">
                    User Directory &amp; Role Management ({users.length})
                  </h2>
                  <p className="text-[13px] text-[#52525B]">
                    Promote or demote accounts between <code className="font-mono">developer</code>{' '}
                    and <code className="font-mono">admin</code> roles via PostgreSQL RPC{' '}
                    <code className="font-mono">admin_set_user_role</code>.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E8E8EC] bg-[#FAFAFA] font-mono text-[11px] uppercase text-[#52525B]">
                      <th className="py-3 px-4">User / Email</th>
                      <th className="py-3 px-4">Organization &amp; Title</th>
                      <th className="py-3 px-4">GitHub</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4 text-right">RBAC Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8EC]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAFAFA]">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0A0A0A]">
                            {u.display_name || 'Developer'}
                          </div>
                          <div className="font-mono text-[12px] text-[#4F46E5]">
                            {u.email || u.id.slice(0, 12)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[#0A0A0A] font-medium">{u.organization}</div>
                          <div className="text-[12px] text-[#52525B]">{u.job_title}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[12px] text-[#52525B]">
                          {u.github_username ? `@${u.github_username}` : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                              u.role === 'admin'
                                ? 'border border-[#6366F1]/40 bg-[#6366F1]/10 text-[#4F46E5]'
                                : 'border border-[#10B981]/40 bg-[#ECFDF5] text-[#047857]'
                            }`}
                          >
                            {u.role === 'admin' && <ShieldCheck className="h-3 w-3" />}
                            <span>{u.role}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[12px] text-[#52525B]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={updatingUserId === u.id}
                            onClick={() => handleToggleUserRole(u)}
                            className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3 py-1 text-[12px] disabled:opacity-50"
                          >
                            <span>
                              {updatingUserId === u.id
                                ? 'Updating…'
                                : u.role === 'admin'
                                  ? 'Set as Developer'
                                  : 'Make Admin'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Global Investigation Runs & Audit Trail */}
            <section className="genesis-card overflow-hidden">
              <div className="border-b border-[#E8E8EC] bg-[#FAFAFA] px-5 py-4">
                <h2 className="text-[17px] font-bold text-[#0A0A0A] font-display">
                  Global Incident Runs &amp; Verification Audit Log ({runs.length})
                </h2>
                <p className="text-[13px] text-[#52525B]">
                  Cross-tenant inspection of all autonomous investigations, sandbox verification
                  statuses, and approval-gated GitHub Draft PRs.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E8E8EC] bg-[#FAFAFA] font-mono text-[11px] uppercase text-[#52525B]">
                      <th className="py-3 px-4">Incident &amp; Repo</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Tokens</th>
                      <th className="py-3 px-4">Draft PR</th>
                      <th className="py-3 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8EC]">
                    {runs.map((r) => {
                      const isVerified =
                        r.status === 'verified' || r.status === 'draft_pr_created';
                      return (
                        <tr key={r.id} className="hover:bg-[#FAFAFA]">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#0A0A0A]">{r.incidentTitle}</div>
                            <div className="font-mono text-[11px] text-[#52525B]">
                              {r.repositoryFullName} @ {r.baseSha.slice(0, 10)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#0A0A0A]">{r.ownerName}</div>
                            <div className="font-mono text-[11px] text-[#52525B]">
                              {r.ownerEmail}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                                isVerified
                                  ? 'border border-[#10B981]/40 bg-[#ECFDF5] text-[#047857]'
                                  : 'border border-[#F59E0B]/40 bg-[#FFFBEB] text-[#B45309]'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[12px] text-[#0A0A0A]">
                            {(
                              (Number(r.input_tokens) || 0) + (Number(r.output_tokens) || 0)
                            ).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[12px]">
                            {r.pullRequestUrl ? (
                              <a
                                href={r.pullRequestUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#047857] font-semibold hover:underline"
                              >
                                <span>PR #{r.pullRequestNumber}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-[#52525B]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={r.is_demo ? '/demo' : `/app/incidents/${r.id}`}
                              className="genesis-btn-secondary inline-flex items-center gap-1 px-3 py-1 text-[12px]"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="h-3 w-3 text-[#6366F1]" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
