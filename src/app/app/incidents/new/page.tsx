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
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] pb-5">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0A0A0A] font-display">
              Start Autonomous Incident Investigation
            </h1>
            <p className="mt-1 text-[14px] text-[#6B6B6B]">
              Supply an allowlisted repository and failing stack trace. RepoMedic will reproduce the
              failure in Vercel Sandbox, query NVIDIA Nemotron on Nebius Token Factory, and verify a
              candidate patch.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrefillSample}
            className="genesis-btn-secondary inline-flex h-[38px] items-center gap-1.5 px-3.5 text-[13px]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
            <span>Prefill Reproducible Fixture Bug</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="genesis-card p-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="repo-select"
                  className="block text-[11px] font-medium uppercase tracking-wider text-[#6B6B6B] font-mono"
                >
                  Allowlisted Target Repository
                </label>
                <select
                  id="repo-select"
                  value={repositoryFullName}
                  onChange={(e) => setRepositoryFullName(e.target.value)}
                  className="genesis-input mt-1.5 w-full font-mono"
                >
                  {allowedRepos.map((repo) => (
                    <option key={repo} value={repo}>
                      {repo} (Allowlisted)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[12px] text-[#9C9C9C]">
                  Public demo blocks arbitrary repo cloning; only allowlisted fixtures are permitted.
                </p>
              </div>

              <div>
                <label
                  htmlFor="base-sha"
                  className="block text-[11px] font-medium uppercase tracking-wider text-[#6B6B6B] font-mono"
                >
                  Pinned Commit SHA
                </label>
                <input
                  id="base-sha"
                  type="text"
                  required
                  value={baseSha}
                  onChange={(e) => setBaseSha(e.target.value)}
                  className="genesis-input mt-1.5 w-full font-mono"
                />
                <p className="mt-1 text-[12px] text-[#9C9C9C]">
                  Both baseline and post-patch tests execute against this exact base revision.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="incident-title"
                  className="block text-[11px] font-medium uppercase tracking-wider text-[#6B6B6B] font-mono"
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
                  className="genesis-input mt-1.5 w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="file-hint"
                  className="block text-[11px] font-medium uppercase tracking-wider text-[#6B6B6B] font-mono"
                >
                  Optional File Hint
                </label>
                <input
                  id="file-hint"
                  type="text"
                  value={affectedFileHint}
                  onChange={(e) => setAffectedFileHint(e.target.value)}
                  placeholder="src/pricing.ts"
                  className="genesis-input mt-1.5 w-full font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="error-trace"
                  className="block text-[11px] font-medium uppercase tracking-wider text-[#6B6B6B] font-mono"
                >
                  Stack Trace / Failing Test Output (≤ 12,000 chars)
                </label>
                <span className="font-mono text-[11px] text-[#9C9C9C]">
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
                className="genesis-input mt-1.5 w-full font-mono leading-relaxed"
              />
            </div>

            {/* Execution Scope & Budget Notice */}
            <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4 text-[13px] text-[#6B6B6B] flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <div className="font-medium text-[#0A0A0A]">
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
                className="flex items-start gap-2 rounded-[6px] border border-[#EF4444]/40 bg-[#EF4444]/10 p-3.5 text-[13px] text-[#EF4444]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <span>{error}</span>
                  {error.toLowerCase().includes('sign in') ||
                  error.toLowerCase().includes('authentication') ? (
                    <div className="mt-2">
                      <Link
                        href="/auth"
                        className="underline font-medium text-[#0A0A0A] hover:text-[#6366F1]"
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
                className="genesis-btn-secondary inline-flex h-[38px] items-center px-4 text-[13px]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="genesis-btn-primary inline-flex h-[38px] items-center gap-2 px-5 text-[13px] disabled:opacity-50"
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
