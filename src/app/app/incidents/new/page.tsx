'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';

const SAMPLE_INCIDENT_TITLE =
  'B2B tax-exempt orders (0% taxRatePercent) erroneously charged 8.5% default tax';
const SAMPLE_INCIDENT_TRACE = `FAIL fixtures/buggy-order-service/tests/pricing.test.ts > calculateOrderInvoice > 5. honors explicit 0% tax rate for tax-exempt B2B orders
AssertionError: expected 8.5 to be +0 // Object.is equality
  - Expected: 0
  + Received: 8.5
 ❯ fixtures/buggy-order-service/tests/pricing.test.ts:63:36
     61|     });
     62| 
     63|     expect(invoice.taxRatePercent).toBe(0);
       |                                    ^
     64|     expect(invoice.taxCents).toBe(0);
     65|     expect(invoice.totalCents).toBe(20000);`;

export default function NewIncidentPage() {
  const router = useRouter();
  const [allowedRepos, setAllowedRepos] = useState<string[]>(['ensuredesign/repomedic-fixture']);
  const [repositoryFullName, setRepositoryFullName] = useState('ensuredesign/repomedic-fixture');
  const [baseSha, setBaseSha] = useState('440255c3e1efe73a24d2cd92b90055c54c3e3549');
  const [title, setTitle] = useState(SAMPLE_INCIDENT_TITLE);
  const [affectedFileHint, setAffectedFileHint] = useState('src/pricing.ts');
  const [errorText, setErrorText] = useState(SAMPLE_INCIDENT_TRACE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        const repos = d?.integrations?.github?.allowedRepositories;
        if (Array.isArray(repos) && repos.length > 0) {
          setAllowedRepos(repos);
          setRepositoryFullName(repos[0]);
        }
      })
      .catch(() => {
        // Keep default allowlisted repo
      });
  }, []);

  function handlePrefillSample() {
    setTitle(SAMPLE_INCIDENT_TITLE);
    setAffectedFileHint('src/pricing.ts');
    setErrorText(SAMPLE_INCIDENT_TRACE);
    setBaseSha('440255c3e1efe73a24d2cd92b90055c54c3e3549');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const incRes = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryFullName,
          baseSha: baseSha.trim() || undefined,
          title,
          affectedFileHint: affectedFileHint.trim() || undefined,
          errorText,
        }),
      });

      if (incRes.status === 401) {
        router.push('/auth');
        return;
      }

      const incData = await incRes.json();
      if (!incRes.ok) {
        throw new Error(incData?.error?.message || 'Failed to create incident.');
      }

      const runRes = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: incData.incident.id,
          idempotencyKey: `inc-${incData.incident.id}`,
        }),
      });

      const runData = await runRes.json();
      if (!runRes.ok) {
        throw new Error(runData?.error?.message || 'Failed to initialize investigation run.');
      }

      router.push(`/app/incidents/${runData.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1017] text-[#F2F7FB]">
      <NavHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#9EB0C1]/15 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#F2F7FB]">
              Start Autonomous Incident Investigation
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#9EB0C1]">
              Supply an allowlisted repository and failing stack trace. RepoMedic will reproduce the
              failure in Vercel Sandbox, query NVIDIA Nemotron on Nebius Token Factory, and verify a
              candidate patch.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrefillSample}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#28C8DB]/40 bg-[#182331] px-3 py-1.5 text-xs font-semibold text-[#28C8DB] hover:bg-[#28C8DB] hover:text-[#0B1017] transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Prefill Reproducible Fixture Bug</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="repo-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#9EB0C1] font-mono"
                >
                  Allowlisted Target Repository
                </label>
                <select
                  id="repo-select"
                  value={repositoryFullName}
                  onChange={(e) => setRepositoryFullName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-3 py-2 font-mono text-xs text-[#F2F7FB]"
                >
                  {allowedRepos.map((repo) => (
                    <option key={repo} value={repo}>
                      {repo} (Allowlisted)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[#9EB0C1]">
                  Public demo blocks arbitrary repo cloning; only allowlisted fixtures are permitted.
                </p>
              </div>

              <div>
                <label
                  htmlFor="base-sha"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#9EB0C1] font-mono"
                >
                  Pinned Commit SHA
                </label>
                <input
                  id="base-sha"
                  type="text"
                  required
                  value={baseSha}
                  onChange={(e) => setBaseSha(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-3 py-2 font-mono text-xs text-[#F2F7FB]"
                />
                <p className="mt-1 text-[11px] text-[#9EB0C1]">
                  Both baseline and post-patch tests execute against this exact base revision.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="incident-title"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#9EB0C1] font-mono"
                >
                  Incident Summary Title
                </label>
                <input
                  id="incident-title"
                  type="text"
                  required
                  minLength={5}
                  maxLength={240}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-3 py-2 text-sm text-[#F2F7FB]"
                />
              </div>

              <div>
                <label
                  htmlFor="file-hint"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#9EB0C1] font-mono"
                >
                  Optional File Hint
                </label>
                <input
                  id="file-hint"
                  type="text"
                  value={affectedFileHint}
                  onChange={(e) => setAffectedFileHint(e.target.value)}
                  placeholder="src/pricing.ts"
                  className="mt-1.5 w-full rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-3 py-2 font-mono text-xs text-[#F2F7FB]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="error-trace"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#9EB0C1] font-mono"
                >
                  Stack Trace / Failing Test Output (≤ 12,000 chars)
                </label>
                <span className="font-mono text-[11px] text-[#9EB0C1]">
                  {errorText.length} / 12000 chars
                </span>
              </div>
              <textarea
                id="error-trace"
                rows={8}
                required
                minLength={15}
                maxLength={12000}
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] p-3 font-mono text-xs text-[#F2F7FB] leading-relaxed"
              />
            </div>

            {/* Execution Scope & Budget Notice */}
            <div className="rounded-lg border border-[#9EB0C1]/15 bg-[#0B1017] p-3.5 text-xs text-[#9EB0C1] flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#21BD9D] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <div className="font-semibold text-[#F2F7FB]">
                  Enforced Execution Guardrails &amp; Run Limits
                </div>
                <p>
                  Max 2 autonomous patch attempts · ≤ 40 allowlisted repository files (≤ 100 KB) ·
                  120s Vercel Sandbox cutoff per test phase · Secrets automatically redacted before
                  model invocation · Zero GitHub writes without explicit post-verification SHA-256
                  approval.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[#F43F5E]/40 bg-[#F43F5E]/10 p-3.5 text-xs text-[#F43F5E]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <span>{error}</span>
                  {error.toLowerCase().includes('sign in') ||
                  error.toLowerCase().includes('authentication') ? (
                    <div className="mt-2">
                      <Link
                        href="/auth"
                        className="underline font-semibold text-[#F2F7FB] hover:text-[#28C8DB]"
                      >
                        Go to Sign In / Create Account →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/app"
                className="rounded-lg border border-[#9EB0C1]/25 bg-[#0B1017] px-4 py-2.5 text-xs font-medium text-[#9EB0C1] hover:text-[#F2F7FB]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#28C8DB] px-5 py-2.5 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <>
                    <Terminal className="h-4 w-4 animate-pulse" aria-hidden="true" />
                    <span>Initializing Investigation…</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" aria-hidden="true" />
                    <span>Launch Live Investigation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
