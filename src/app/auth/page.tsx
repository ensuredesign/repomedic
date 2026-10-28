'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  LogIn,
  MailCheck,
  Send,
  Shield,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { NavHeader, primeAuthSessionCache } from '@/components/nav-header';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoginRole, setQuickLoginRole] = useState<'admin' | 'user' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch('/app');
    router.prefetch('/admin');
    router.prefetch('/app/profile');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qMode = params.get('mode');
      const qEmail = params.get('email');
      const qCode = params.get('code');
      if (qEmail) setEmail(qEmail);
      if (qCode) setResetCode(qCode);
      if (qMode === 'reset' || qCode) {
        setMode('reset');
      } else if (qMode === 'forgot') {
        setMode('forgot');
      } else if (qMode === 'signup') {
        setMode('signup');
      }
    }
  }, [router]);

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
      primeAuthSessionCache(demoCredentials.email, role === 'admin' ? 'admin' : 'developer');
      router.push(demoCredentials.destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'One-click demo sign-in failed.');
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
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === 'signin') {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInErr) throw signInErr;
        primeAuthSessionCache(
          normalizedEmail,
          normalizedEmail === 'admin@repomedic.dev' ? 'admin' : 'developer',
        );
        router.push('/app');
        return;
      }

      if (mode === 'signup') {
        const resolvedName = fullName.trim() || normalizedEmail.split('@')[0];
        const resolvedOrg = organization.trim() || 'RepoMedic Engineering';
        const resolvedTitle = jobTitle.trim() || 'Software Engineer';
        const resolvedGithub = githubUsername.trim() || null;

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: resolvedName,
              organization: resolvedOrg,
              job_title: resolvedTitle,
              github_username: resolvedGithub,
            },
          },
        });
        if (signUpErr) throw signUpErr;

        if (!data.session) {
          const { error: autoSignInErr } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (autoSignInErr) {
            setInfoMessage('Account created! Switch to Sign In to access your workspace.');
            setLoading(false);
            return;
          }
        }

        primeAuthSessionCache(normalizedEmail, 'developer');

        // Dispatch Welcome Email via Resend in the background / await confirmation
        await fetch('/api/auth/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: resolvedName,
            organization: resolvedOrg,
            jobTitle: resolvedTitle,
            githubUsername: resolvedGithub,
          }),
        }).catch(() => null);

        router.push('/app/profile?welcome=sent');
        return;
      }

      if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || 'Failed to send password reset email.');
        }
        setInfoMessage(
          data.message ||
            `Password reset email sent to ${normalizedEmail} via Resend. Enter the 6-digit recovery code below.`,
        );
        setMode('reset');
        setLoading(false);
        return;
      }

      if (mode === 'reset') {
        if (newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        if (confirmNewPassword && newPassword !== confirmNewPassword) {
          throw new Error('New password and confirmation password do not match.');
        }

        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            code: resetCode.trim(),
            newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || 'Password reset failed. Check your 6-digit code.');
        }

        // Automatically sign in with the newly reset password
        const { error: loginAfterResetErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: newPassword,
        });

        if (!loginAfterResetErr) {
          primeAuthSessionCache(
            normalizedEmail,
            normalizedEmail === 'admin@repomedic.dev' ? 'admin' : 'developer',
          );
          router.push('/app/profile?reset=success');
          return;
        }

        setPassword(newPassword);
        setMode('signin');
        setInfoMessage('Password reset successfully! You can now sign in with your new password.');
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F]">
      <NavHeader />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 space-y-6">
        {/* Hackathon 1-Click Demo Login Banner */}
        <section
          aria-labelledby="one-click-demo-heading"
          className="genesis-card border-[#0071E3]/30 bg-[#FFFFFF] p-5 sm:p-6"
        >
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0071E3]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Nebius × NVIDIA Hackathon · Instant Jury Access</span>
          </div>
          <h2
            id="one-click-demo-heading"
            className="mt-1.5 text-[18px] font-bold text-[#1D1D1F] font-display"
          >
            One-Click Demo Login (Admin &amp; Developer / Judge)
          </h2>
          <p className="mt-1 text-[13px] text-[#515154] leading-relaxed">
            Test the live application immediately without typing credentials. Choose{' '}
            <strong className="text-[#1D1D1F]">Demo User / Judge</strong> to inspect verified
            Nemotron + Vercel Sandbox runs and create new investigations, or{' '}
            <strong className="text-[#1D1D1F]">Demo Admin</strong> to inspect the Platform Admin
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
                  ? 'Opening Workspace…'
                  : '1-Click User / Judge Login'}
              </span>
            </button>

            <button
              id="one-click-admin-login"
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemoLogin('admin')}
              className="genesis-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 border-[#0071E3]/30 bg-[#F5F5F7] px-4 py-2.5 text-[13px] font-semibold text-[#0071E3] hover:bg-[#0071E3]/10 disabled:opacity-50"
            >
              <Shield className="h-4 w-4 shrink-0 text-[#0071E3]" aria-hidden="true" />
              <span>
                {quickLoginRole === 'admin' ? 'Opening Admin Panel…' : '1-Click Admin Panel Login'}
              </span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-[11px] font-mono text-[#515154]">
            <div className="rounded-[8px] border border-black/[0.07] bg-[#F5F5F7] px-2.5 py-1.5">
              User: <span className="text-[#1D1D1F]">judge@repomedic.dev</span> (Isolated Account)
            </div>
            <div className="rounded-[8px] border border-black/[0.07] bg-[#F5F5F7] px-2.5 py-1.5">
              Admin: <span className="text-[#1D1D1F]">admin@repomedic.dev</span> (Full Governance)
            </div>
          </div>
        </section>

        {/* Sign-In, Registration & Forgot/Reset Password Card */}
        <div className="genesis-card p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#0071E3] font-mono text-[11px] font-semibold uppercase tracking-wider">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Supabase Auth · Resend Email · PostgreSQL RLS</span>
            </div>
            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setInfoMessage(null);
                }}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0071E3] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to Sign In</span>
              </button>
            )}
          </div>

          <h1 className="mt-2 text-[24px] font-bold text-[#1D1D1F] font-display">
            {mode === 'signin' && 'Sign in to RepoMedic'}
            {mode === 'signup' && 'Register Developer Account'}
            {mode === 'forgot' && 'Forgot Your Password?'}
            {mode === 'reset' && 'Enter Recovery Code & New Password'}
          </h1>
          <p className="mt-1 text-[13px] text-[#515154] leading-relaxed">
            {mode === 'signin' &&
              'All incidents, runs, test logs, and PR approvals are isolated per user via PostgreSQL Row-Level Security.'}
            {mode === 'signup' &&
              'Creates an isolated developer account in Supabase Postgres and dispatches an instant Welcome Email via Resend (info@ensure.in).'}
            {mode === 'forgot' &&
              'Enter your registered email address. We will send a 6-digit recovery code and 1-click reset link via Resend (info@ensure.in).'}
            {mode === 'reset' &&
              'Enter the 6-digit recovery code delivered to your email along with your new password.'}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-[10px] bg-[#F5F5F7] p-1 border border-black/[0.07]">
            <button
              id="tab-signin"
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setInfoMessage(null);
              }}
              className={`rounded-[7px] py-2 text-[13px] font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-2xs border border-black/[0.06]'
                  : 'text-[#515154] hover:text-[#1D1D1F]'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-signup"
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setInfoMessage(null);
              }}
              className={`rounded-[7px] py-2 text-[13px] font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-2xs border border-black/[0.06]'
                  : 'text-[#515154] hover:text-[#1D1D1F]'
              }`}
            >
              Create Account
            </button>
            <button
              id="tab-forgot"
              type="button"
              onClick={() => {
                setMode(mode === 'reset' ? 'reset' : 'forgot');
                setError(null);
                setInfoMessage(null);
              }}
              className={`rounded-[7px] py-2 text-[13px] font-medium transition-all ${
                mode === 'forgot' || mode === 'reset'
                  ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-2xs border border-black/[0.06]'
                  : 'text-[#515154] hover:text-[#1D1D1F]'
              }`}
            >
              Forgot Password
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label
                    htmlFor="auth-fullname"
                    className="block text-[13px] font-medium text-[#1D1D1F]"
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
                      className="block text-[13px] font-medium text-[#1D1D1F]"
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
                      className="block text-[13px] font-medium text-[#1D1D1F]"
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
                    className="block text-[13px] font-medium text-[#1D1D1F]"
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
              <label htmlFor="auth-email" className="block text-[13px] font-medium text-[#1D1D1F]">
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

            {(mode === 'signin' || mode === 'signup') && (
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-[13px] font-medium text-[#1D1D1F]"
                  >
                    Password (min 6 characters)
                  </label>
                  {mode === 'signin' && (
                    <button
                      id="forgot-password-link"
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-[12px] font-medium text-[#0071E3] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            )}

            {mode === 'forgot' && (
              <div className="rounded-[10px] border border-black/[0.06] bg-[#F5F5F7] p-3.5 text-[12px] text-[#515154] flex items-center justify-between gap-2">
                <span>Already have a 6-digit recovery code from your email?</span>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="font-semibold text-[#0071E3] hover:underline shrink-0"
                >
                  Enter Code →
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div>
                  <label
                    htmlFor="auth-reset-code"
                    className="block text-[13px] font-medium text-[#1D1D1F]"
                  >
                    6-Digit Security Recovery Code (sent via Resend)
                  </label>
                  <input
                    id="auth-reset-code"
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="e.g. 482910"
                    className="genesis-input mt-1.5 w-full font-mono tracking-widest text-[15px]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="auth-new-password"
                      className="block text-[13px] font-medium text-[#1D1D1F]"
                    >
                      New Password (min 6 chars)
                    </label>
                    <input
                      id="auth-new-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="genesis-input mt-1.5 w-full"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-confirm-password"
                      className="block text-[13px] font-medium text-[#1D1D1F]"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="auth-confirm-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="genesis-input mt-1.5 w-full"
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[10px] border border-[#EF4444]/40 bg-[#FEF2F2] p-3 text-[13px] text-[#B91C1C]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-[10px] border border-[#10B981]/40 bg-[#ECFDF5] p-3 text-[13px] text-[#047857]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{infoMessage}</span>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="genesis-btn-primary w-full inline-flex h-[44px] items-center justify-center gap-2 px-4 text-[14px] disabled:opacity-50"
            >
              {mode === 'signin' && (
                <>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>{loading ? 'Signing in…' : 'Sign In with Email'}</span>
                </>
              )}
              {mode === 'signup' && (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {loading
                      ? 'Creating Account & Sending Welcome Email…'
                      : 'Create Account & Send Welcome Email'}
                  </span>
                </>
              )}
              {mode === 'forgot' && (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {loading ? 'Sending Reset Email…' : 'Send Password Reset Email via Resend'}
                  </span>
                </>
              )}
              {mode === 'reset' && (
                <>
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {loading ? 'Verifying Code & Updating Password…' : 'Reset Password & Sign In'}
                  </span>
                </>
              )}
            </button>

            {mode === 'signup' && (
              <div className="flex items-center justify-center gap-1.5 pt-1 text-[12px] text-[#515154]">
                <MailCheck className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                <span>
                  Automatic Welcome Email delivered via{' '}
                  <code className="font-mono text-[11px]">RepoMedic &lt;info@ensure.in&gt;</code>
                </span>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
