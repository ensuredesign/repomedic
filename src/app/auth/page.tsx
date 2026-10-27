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
    <div className="min-h-screen flex flex-col bg-[#0B1017] text-[#F2F7FB]">
      <NavHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-[#9EB0C1]/20 bg-[#111923] p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2.5 text-[#28C8DB] font-mono text-xs font-semibold uppercase tracking-wider">
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>Supabase Auth · RLS Protected</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-[#F2F7FB]">
            {mode === 'signin' ? 'Sign in to RepoMedic' : 'Create Judge / Developer Account'}
          </h1>
          <p className="mt-1 text-xs text-[#9EB0C1]">
            All incidents, runs, test logs, and PR approvals are isolated per user via PostgreSQL
            Row-Level Security.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[#0B1017] p-1 border border-[#9EB0C1]/15">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                mode === 'signin'
                  ? 'bg-[#182331] text-[#28C8DB]'
                  : 'text-[#9EB0C1] hover:text-[#F2F7FB]'
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
              className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                mode === 'signup'
                  ? 'bg-[#182331] text-[#28C8DB]'
                  : 'text-[#9EB0C1] hover:text-[#F2F7FB]'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-[#F2F7FB]">
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
                className="mt-1.5 w-full rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-3.5 py-2 text-sm text-[#F2F7FB] placeholder:text-[#9EB0C1]/40 focus:border-[#28C8DB]"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-[#F2F7FB]">
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
                className="mt-1.5 w-full rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-3.5 py-2 text-sm text-[#F2F7FB] placeholder:text-[#9EB0C1]/40 focus:border-[#28C8DB]"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[#F43F5E]/40 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg border border-[#21BD9D]/40 bg-[#21BD9D]/10 p-3 text-xs text-[#21BD9D]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{infoMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#28C8DB] px-4 py-2.5 text-sm font-semibold text-[#0B1017] hover:bg-[#21BD9D] disabled:opacity-50 transition-colors"
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
