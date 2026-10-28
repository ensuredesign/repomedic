'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Lock, LogIn, UserPlus } from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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
        });
        if (signUpErr) throw signUpErr;
        if (data.session) {
          router.push('/app');
          router.refresh();
        } else {
          setInfoMessage(
            'Account created! If email confirmation is disabled on this dev instance, switch to Sign In now.',
          );
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

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="genesis-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[#6366F1] font-mono text-[11px] font-medium uppercase tracking-wider">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Supabase Auth · RLS Protected</span>
          </div>

          <h1 className="mt-2 text-[24px] font-bold text-[#0A0A0A] font-display">
            {mode === 'signin' ? 'Sign in to RepoMedic' : 'Create Judge / Developer Account'}
          </h1>
          <p className="mt-1 text-[13px] text-[#6B6B6B]">
            All incidents, runs, test logs, and PR approvals are isolated per user via PostgreSQL
            Row-Level Security.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-[6px] bg-[#FAFAFA] p-1 border border-[#E8E8EC]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`rounded-[4px] py-1.5 text-[13px] font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border border-[#E8E8EC]'
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
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
              className={`rounded-[4px] py-1.5 text-[13px] font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border border-[#E8E8EC]'
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
              <label htmlFor="auth-password" className="block text-[13px] font-medium text-[#0A0A0A]">
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
                className="flex items-start gap-2 rounded-[6px] border border-[#EF4444]/40 bg-[#EF4444]/10 p-3 text-[13px] text-[#EF4444]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-[6px] border border-[#10B981]/40 bg-[#10B981]/10 p-3 text-[13px] text-[#10B981]"
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
                  <span>{loading ? 'Signing in…' : 'Sign In'}</span>
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
