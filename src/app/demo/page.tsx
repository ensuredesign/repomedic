'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Play,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import { ProofOfFixPanel } from '@/components/proof-of-fix-panel';
import type { CompleteRunBundle } from '@/lib/supabase/types';

export default function DemoCaseStudyPage() {
  const [bundle, setBundle] = useState<CompleteRunBundle | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to load demo case study');
      }
      setBundle(data.bundle);
      setDisclaimer(data.disclaimer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDemo();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1017] text-[#F2F7FB]">
      <NavHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Provenance Notice Banner */}
        <div className="rounded-xl border border-[#F59E0B]/40 bg-[#182331] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 shrink-0 text-[#F59E0B] mt-0.5" aria-hidden="true" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-[#F2F7FB]">
                    Judge Inspection View — Recorded Case Study vs. Live Investigation
                  </h1>
                  <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#F59E0B]">
                    READ-ONLY RECORDED CASE STUDY
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-[#9EB0C1] max-w-3xl">
                  {disclaimer ||
                    'Below is a curated, read-only case study stored in Supabase (is_demo=true) so judges can inspect a complete Proof of Fix immediately without signing in. To execute a fresh runtime call to Nebius Token Factory + Vercel Sandbox, click "Run Live Investigation".'}
                </p>
              </div>
            </div>

            <Link
              href="/app/incidents/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#28C8DB] px-4 py-2.5 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] transition-colors shrink-0"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Run Live Investigation</span>
            </Link>
          </div>
        </div>

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#9EB0C1]/15 bg-[#111923] p-12 text-center"
          >
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#28C8DB]" aria-hidden="true" />
            <p className="mt-3 text-sm text-[#9EB0C1]">
              Loading curated case study from Supabase Postgres…
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#F43F5E]/40 bg-[#111923] p-6 text-sm text-[#F43F5E] flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {bundle && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left column: Incident + Stage Event Rail */}
            <div className="lg:col-span-4 space-y-6">
              <section className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9EB0C1] font-mono">
                  Incident Input
                </h2>
                <h3 className="mt-2 text-base font-semibold text-[#F2F7FB]">
                  {bundle.incident.title}
                </h3>
                <div className="mt-2 font-mono text-xs text-[#28C8DB]">
                  Repo: {bundle.incident.repository_full_name}
                </div>
                <div className="font-mono text-xs text-[#9EB0C1]">
                  Pinned SHA: {bundle.incident.base_sha.slice(0, 16)}
                </div>

                <div className="mt-3">
                  <div className="text-xs font-medium text-[#9EB0C1] mb-1">
                    Failing Stack Trace / Test Output:
                  </div>
                  <pre className="max-h-48 overflow-auto rounded-lg border border-[#9EB0C1]/15 bg-[#0B1017] p-3 font-mono text-[11px] text-[#F43F5E]/90 whitespace-pre-wrap">
                    {bundle.incident.error_text_redacted}
                  </pre>
                </div>
              </section>

              <section className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9EB0C1] font-mono">
                    Recorded Stage Timeline
                  </h2>
                  <span className="font-mono text-xs text-[#9EB0C1]">
                    {bundle.events.length} events
                  </span>
                </div>

                <ol className="mt-4 space-y-3">
                  {bundle.events.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-[#9EB0C1]/15 bg-[#0B1017] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#28C8DB]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#21BD9D]" aria-hidden="true" />
                          <span>
                            #{ev.seq} · {ev.stage}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-[#9EB0C1]">
                          {ev.event_type}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-[#F2F7FB]/90 leading-relaxed">
                        {ev.summary}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* Right column: Hero Proof of Fix Panel */}
            <div className="lg:col-span-8 space-y-6">
              <ProofOfFixPanel bundle={bundle} isRecordedDemo={true} showReviewLink={false} />

              <div className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-[#28C8DB] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#F2F7FB]">
                      Want to run this exact bug through live NVIDIA Nemotron &amp; Vercel Sandbox?
                    </h3>
                    <p className="text-xs text-[#9EB0C1] mt-0.5">
                      Sign in and prefill the allowlisted fixture repository on the New Incident
                      screen to watch each stage execute live.
                    </p>
                  </div>
                </div>
                <Link
                  href="/app/incidents/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#28C8DB] px-4 py-2 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] transition-colors"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Launch Live Run</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
