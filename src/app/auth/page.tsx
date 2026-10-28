'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  LogIn,
  Shield,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoginRole, setQuickLoginRole] = useState<'admin' | 'user' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleOneClickDemoLogin(role: 'admin' | 'user') {
    setQuickLoginRole(role);
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    const demoCredentials =
      role === 'admin'
        ? {
            email: 'admin@repomedic.dev',
            password: 'RepoMedicAdmin!2026',
            destination: '/admin',
          }
        : {
            email: 'judge@repomedic.dev',
            password: 'RepoMedicJudge!2026',
            destination: '/app',
          };

    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: demoCredentials.email,
        password: demoCredentials.password,
      });
      if (signInErr) throw signInErr;
      router.push(demoCredentials.destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'One-click demo sign-in failed.');
    } finally {
      setLoading(false);
      setQuickLoginRole(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === 'signin') {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
        router.push('/app');
        router.refresh();
      } else {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.trim().split('@')[0],
              organization: organization.trim() || 'RepoMedic Engineering',
              job_title: jobTitle.trim() || 'Software Engineer',
              github_username: githubUsername.trim() || null,
            },
          },
        });
        if (signUpErr) throw signUpErr;
        if (data.session) {
          router.push('/app/profile');
          router.refresh();
        } else {
          const { error: autoSignInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (!autoSignInErr) {
            router.push('/app/profile');
            router.refresh();
          } else {
            setInfoMessage('Account created! Switch to Sign In to access your workspace.');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 space-y-6">
        {/* Hackathon 1-Click Demo Login Banner */}
        <section
          aria-labelledby="one-click-demo-heading"
          className="genesis-card border-[#6366F1]/40 bg-[#FFFFFF] p-5 sm:p-6"
        >
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4F46E5]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Nebius × NVIDIA Hackathon · Instant Jury Access</span>
          </div>
          <h2
            id="one-click-demo-heading"
            className="mt-1.5 text-[18px] font-bold text-[#0A0A0A] font-display"
          >
            One-Click Demo Login (Admin &amp; Developer / Judge)
          </h2>
          <p className="mt-1 text-[13px] text-[#52525B] leading-relaxed">
            Test the live application immediately without typing credentials. Choose{' '}
            <strong className="text-[#0A0A0A]">Demo User / Judge</strong> to inspect verified
            Nemotron + Vercel Sandbox runs and create new investigations, or{' '}
            <strong className="text-[#0A0A0A]">Demo Admin</strong> to inspect the Platform Admin
            Panel &amp; RBAC controls.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              id="one-click-user-login"
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemoLogin('user')}
              className="genesis-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 text-[13px] disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {quickLoginRole === 'user'
                  ? 'Signing in as User…'
                  : '1-Click User / Judge Login'}
              </span>
            </button>

            <button
              id="one-click-admin-login"
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemoLogin('admin')}
              className="genesis-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 border-[#6366F1]/40 bg-[#FAFAFA] px-4 py-2.5 text-[13px] font-semibold text-[#4F46E5] hover:bg-[#6366F1]/10 disabled:opacity-50"
            >
              <Shield className="h-4 w-4 shrink-0 text-[#4F46E5]" aria-hidden="true" />
              <span>
                {quickLoginRole === 'admin' ? 'Signing in as Admin…' : '1-Click Admin Panel Login'}
              </span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-[11px] font-mono text-[#52525B]">
            <div className="rounded-[6px] border border-[#E8E8EC] bg-[#FAFAFA] px-2.5 py-1.5">
              User: <span className="text-[#0A0A0A]">judge@repomedic.dev</span> (3 Verified Runs)
            </div>
            <div className="rounded-[6px] border border-[#E8E8EC] bg-[#FAFAFA] px-2.5 py-1.5">
              Admin: <span className="text-[#0A0A0A]">admin@repomedic.dev</span> (Full Governance)
            </div>
          </div>
        </section>

        {/* Standard Sign-In & User Registration Card */}
        <div className="genesis-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[#4F46E5] font-mono text-[11px] font-semibold uppercase tracking-wider">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Supabase Auth · PostgreSQL RLS Protected</span>
          </div>

          <h1 className="mt-2 text-[24px] font-bold text-[#0A0A0A] font-display">
            {mode === 'signin' ? 'Sign in to RepoMedic' : 'Register Developer Account'}
          </h1>
          <p className="mt-1 text-[13px] text-[#52525B]">
            {mode === 'signin'
              ? 'All incidents, runs, test logs, and PR approvals are isolated per user via PostgreSQL Row-Level Security.'
              : 'Register a new account with full profile metadata stored in Supabase Postgres.'}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-[6px] bg-[#FAFAFA] p-1 border border-[#E8E8EC]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`rounded-[4px] py-2 text-[13px] font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border border-[#E8E8EC]'
                  : 'text-[#52525B] hover:text-[#0A0A0A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`rounded-[4px] py-2 text-[13px] font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border border-[#E8E8EC]'
                  : 'text-[#52525B] hover:text-[#0A0A0A]'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label
                    htmlFor="auth-fullname"
                    className="block text-[13px] font-medium text-[#0A0A0A]"
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="genesis-input mt-1.5 w-full"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="auth-org"
                      className="block text-[13px] font-medium text-[#0A0A0A]"
                    >
                      Organization / Team
                    </label>
                    <input
                      id="auth-org"
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="RepoMedic Core Team"
                      className="genesis-input mt-1.5 w-full"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-job-title"
                      className="block text-[13px] font-medium text-[#0A0A0A]"
                    >
                      Role / Job Title
                    </label>
                    <input
                      id="auth-job-title"
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Senior SRE / AI Engineer"
                      className="genesis-input mt-1.5 w-full"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-github"
                    className="block text-[13px] font-medium text-[#0A0A0A]"
                  >
                    GitHub Handle (Optional)
                  </label>
                  <input
                    id="auth-github"
                    type="text"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="ensuredesign"
                    className="genesis-input mt-1.5 w-full font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-[13px] font-medium text-[#0A0A0A]">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="judge@repomedic.dev"
                className="genesis-input mt-1.5 w-full"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-[13px] font-medium text-[#0A0A0A]"
              >
                Password (min 6 characters)
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="genesis-input mt-1.5 w-full"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[6px] border border-[#EF4444]/40 bg-[#FEF2F2] p-3 text-[13px] text-[#B91C1C]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-[6px] border border-[#10B981]/40 bg-[#ECFDF5] p-3 text-[13px] text-[#047857]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{infoMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="genesis-btn-primary w-full inline-flex h-[44px] items-center justify-center gap-2 px-4 text-[14px] disabled:opacity-50"
            >
              {mode === 'signin' ? (
                <>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>{loading ? 'Signing in…' : 'Sign In with Email'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{loading ? 'Creating account…' : 'Create Account & Continue'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
