'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Cpu,
  GitPullRequestDraft,
  KeyRound,
  LogIn,
  Mail,
  RefreshCw,
  Save,
  Shield,
  UserCircle2,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ProfileRow } from '@/lib/supabase/types';

interface ProfileStats {
  totalIncidents: number;
  totalRuns: number;
  verifiedRuns: number;
  draftPrsCreated: number;
  totalNemotronTokens: number;
}

export default function UserProfilePage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [bio, setBio] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [profileTab, setProfileTab] = useState<'all' | 'identity' | 'security'>('all');

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' });
      if (res.status === 401) {
        setUnauthenticated(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to load profile');
      }
      const p = data.profile as ProfileRow;
      setProfile(p);
      setStats(data.stats as ProfileStats);
      setDisplayName(p.display_name || '');
      setOrganization(p.organization || 'RepoMedic Engineering');
      setJobTitle(p.job_title || 'Software Engineer');
      setGithubUsername(p.github_username || '');
      setNotificationEmail(p.notification_email || p.email || '');
      setBio(p.bio || '');
    } catch (err) {
      setSaveMessage({
        ok: false,
        text: err instanceof Error ? err.message : 'Failed to load profile',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          organization,
          job_title: jobTitle,
          github_username: githubUsername || null,
          notification_email: notificationEmail || null,
          bio: bio || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to update profile');
      }
      setProfile(data.profile as ProfileRow);
      setSaveMessage({
        ok: true,
        text: 'Profile saved to Supabase Postgres.',
      });
    } catch (err) {
      setSaveMessage({
        ok: false,
        text: err instanceof Error ? err.message : 'Error updating profile',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) return;
    setUpdatingPassword(true);
    setPasswordMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setPasswordMessage({
        ok: true,
        text: 'Password updated successfully via Supabase Auth.',
      });
    } catch (err) {
      setPasswordMessage({
        ok: false,
        text: err instanceof Error ? err.message : 'Failed to update password',
      });
    } finally {
      setUpdatingPassword(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] pb-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4F46E5]">
              <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Supabase Auth &amp; Profile Management</span>
            </div>
            <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold text-[#0A0A0A] font-display">
              Developer Profile &amp; Preferences
            </h1>
          </div>

          {profile?.role === 'admin' && (
            <Link
              href="/admin"
              className="genesis-btn-primary inline-flex items-center gap-2 px-4 py-2 text-[13px]"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>Open Admin Panel</span>
            </Link>
          )}
        </div>

        {loading && (
          <div role="status" aria-live="polite" className="genesis-card p-12 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <p className="mt-3 text-[14px] text-[#52525B]">Loading your profile &amp; telemetry…</p>
          </div>
        )}

        {!loading && unauthenticated && (
          <div className="genesis-card p-8 text-center max-w-xl mx-auto">
            <h2 className="text-[20px] font-bold text-[#0A0A0A] font-display">
              Sign in to manage your profile
            </h2>
            <p className="mt-2 text-[14px] text-[#52525B]">
              Use our 1-click Hackathon demo login on the Sign In page to inspect Developer or Admin
              profiles immediately.
            </p>
            <Link
              href="/auth"
              className="genesis-btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Go to 1-Click Demo Login</span>
            </Link>
          </div>
        )}

        {!loading && profile && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left column: Identity Card + Personal Telemetry */}
            <div className="lg:col-span-4 space-y-6">
              <section className="genesis-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#52525B]">
                      Authenticated Identity
                    </span>
                    <h2 className="mt-1 text-[20px] font-bold text-[#0A0A0A] font-display">
                      {profile.display_name || 'Developer'}
                    </h2>
                    <p className="font-mono text-[12px] text-[#4F46E5]">{profile.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase ${
                      profile.role === 'admin'
                        ? 'border border-[#6366F1]/40 bg-[#6366F1]/10 text-[#4F46E5]'
                        : 'border border-[#10B981]/40 bg-[#ECFDF5] text-[#047857]'
                    }`}
                  >
                    {profile.role}
                  </span>
                </div>

                <div className="space-y-2 border-t border-[#E8E8EC] pt-3 text-[13px] text-[#52525B]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                      Organization
                    </span>
                    <span className="font-medium text-[#0A0A0A]">{profile.organization}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Role / Title</span>
                    <span className="font-medium text-[#0A0A0A]">{profile.job_title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GitHub Handle</span>
                    <span className="font-mono text-[12px] text-[#0A0A0A]">
                      {profile.github_username ? `@${profile.github_username}` : 'Not linked'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>User UUID</span>
                    <span className="font-mono text-[11px] text-[#52525B]">
                      {profile.id.slice(0, 12)}…
                    </span>
                  </div>
                </div>
              </section>

              {stats && (
                <section className="genesis-card p-5 space-y-4">
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#52525B]">
                    Your Investigation Telemetry
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3">
                      <div className="text-[11px] text-[#52525B] font-mono">INCIDENTS</div>
                      <div className="mt-1 text-[22px] font-bold text-[#0A0A0A] font-display">
                        {stats.totalIncidents}
                      </div>
                    </div>
                    <div className="rounded-[8px] border border-[#10B981]/30 bg-[#ECFDF5] p-3">
                      <div className="text-[11px] text-[#047857] font-mono font-semibold">
                        VERIFIED FIXES
                      </div>
                      <div className="mt-1 text-[22px] font-bold text-[#047857] font-display">
                        {stats.verifiedRuns}
                      </div>
                    </div>
                    <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3">
                      <div className="flex items-center gap-1 text-[11px] text-[#52525B] font-mono">
                        <GitPullRequestDraft className="h-3 w-3 text-[#6366F1]" />
                        <span>DRAFT PRs</span>
                      </div>
                      <div className="mt-1 text-[22px] font-bold text-[#0A0A0A] font-display">
                        {stats.draftPrsCreated}
                      </div>
                    </div>
                    <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3">
                      <div className="flex items-center gap-1 text-[11px] text-[#52525B] font-mono">
                        <Cpu className="h-3 w-3 text-[#6366F1]" />
                        <span>NEMOTRON TOKENS</span>
                      </div>
                      <div className="mt-1 text-[20px] font-bold text-[#0A0A0A] font-mono">
                        {stats.totalNemotronTokens.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Right column: Edit Profile Form + Password Update */}
            <div className="lg:col-span-8 space-y-6">
              <div
                role="tablist"
                aria-label="Profile Settings Tabs"
                className="flex flex-wrap gap-1.5 rounded-[10px] border border-[#E8E8EC] bg-[#FFFFFF] p-1.5"
              >
                {[
                  { key: 'all' as const, label: 'All Profile Settings' },
                  { key: 'identity' as const, label: 'Identity, GitHub & Resend' },
                  { key: 'security' as const, label: 'Password & Auth Security' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={profileTab === t.key}
                    onClick={() => setProfileTab(t.key)}
                    className={`rounded-[7px] px-3.5 py-2 text-[13px] font-medium transition-all ${
                      profileTab === t.key
                        ? 'bg-[#6366F1] text-[#FFFFFF] shadow-xs'
                        : 'text-[#52525B] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {(profileTab === 'all' || profileTab === 'identity') && (
              <section className="genesis-card p-6">
                <h2 className="text-[18px] font-bold text-[#0A0A0A] font-display">
                  Edit Profile &amp; Notification Settings
                </h2>
                <p className="mt-1 text-[13px] text-[#52525B]">
                  Changes are persisted directly to <code className="font-mono">public.profiles</code>{' '}
                  under PostgreSQL Row-Level Security.
                </p>

                <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-display-name"
                        className="block text-[13px] font-medium text-[#0A0A0A]"
                      >
                        Display Name
                      </label>
                      <input
                        id="profile-display-name"
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="genesis-input mt-1.5 w-full"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-github"
                        className="block text-[13px] font-medium text-[#0A0A0A]"
                      >
                        GitHub Username
                      </label>
                      <input
                        id="profile-github"
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="ensuredesign"
                        className="genesis-input mt-1.5 w-full font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-organization"
                        className="block text-[13px] font-medium text-[#0A0A0A]"
                      >
                        Organization / Team
                      </label>
                      <input
                        id="profile-organization"
                        type="text"
                        required
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="genesis-input mt-1.5 w-full"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-job-title"
                        className="block text-[13px] font-medium text-[#0A0A0A]"
                      >
                        Job Title / Engineering Role
                      </label>
                      <input
                        id="profile-job-title"
                        type="text"
                        required
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="genesis-input mt-1.5 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-notification-email"
                      className="flex items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A]"
                    >
                      <Mail className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                      <span>Default Resend Proof-of-Fix Notification Email</span>
                    </label>
                    <input
                      id="profile-notification-email"
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      className="genesis-input mt-1.5 w-full"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-bio"
                      className="block text-[13px] font-medium text-[#0A0A0A]"
                    >
                      Engineering Bio / On-Call Notes
                    </label>
                    <textarea
                      id="profile-bio"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="On-call incident lead for checkout & billing microservices."
                      className="genesis-input mt-1.5 w-full py-2"
                    />
                  </div>

                  {saveMessage && (
                    <div
                      role="status"
                      className={`flex items-center gap-2 rounded-[6px] border p-3 text-[13px] ${
                        saveMessage.ok
                          ? 'border-[#10B981]/40 bg-[#ECFDF5] text-[#047857]'
                          : 'border-[#EF4444]/40 bg-[#FEF2F2] text-[#B91C1C]'
                      }`}
                    >
                      {saveMessage.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      <span>{saveMessage.text}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="genesis-btn-primary inline-flex items-center gap-2 px-5 py-2 text-[13px] disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      <span>{saving ? 'Saving Changes…' : 'Save Profile'}</span>
                    </button>
                  </div>
                </form>
              </section>
              )}

              {/* Password Management Card */}
              {(profileTab === 'all' || profileTab === 'security') && (
              <section className="genesis-card p-6">
                <div className="flex items-center gap-2 text-[16px] font-bold text-[#0A0A0A] font-display">
                  <KeyRound className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                  <h2>Update Account Password</h2>
                </div>
                <p className="mt-1 text-[13px] text-[#52525B]">
                  Rotate your Supabase Auth password (minimum 6 characters).
                </p>

                <form onSubmit={handleUpdatePassword} className="mt-4 flex flex-wrap gap-3">
                  <input
                    id="profile-new-password"
                    type="password"
                    minLength={6}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="genesis-input flex-1 min-w-[220px]"
                  />
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="genesis-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-[13px] disabled:opacity-50"
                  >
                    <span>{updatingPassword ? 'Updating…' : 'Update Password'}</span>
                  </button>
                </form>

                {passwordMessage && (
                  <p
                    role="status"
                    className={`mt-2 text-[12px] font-mono ${
                      passwordMessage.ok ? 'text-[#047857]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {passwordMessage.text}
                  </p>
                )}
              </section>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
