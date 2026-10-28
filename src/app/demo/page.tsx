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
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 space-y-6">
        {/* Provenance Notice Banner */}
        <div className="genesis-card border-[#F59E0B]/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 shrink-0 text-[#F59E0B] mt-0.5" aria-hidden="true" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[20px] font-bold text-[#0A0A0A] font-display">
                    Judge Inspection View — Recorded Case Study vs. Live Investigation
                  </h1>
                  <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1 font-mono text-[11px] font-medium text-[#F59E0B]">
                    READ-ONLY RECORDED CASE STUDY
                  </span>
                </div>
                <p className="mt-1.5 text-[14px] text-[#6B6B6B] max-w-3xl leading-relaxed">
                  {disclaimer ||
                    'Below is a curated, read-only case study stored in Supabase (is_demo=true) so judges can inspect a complete Proof of Fix immediately without signing in. To execute a fresh runtime call to Nebius Token Factory + Vercel Sandbox, click "Run Live Investigation".'}
                </p>
              </div>
            </div>

            <Link
              href="/app/incidents/new"
              className="genesis-btn-primary inline-flex h-[38px] items-center gap-2 px-4 text-[13px] shrink-0"
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
            className="genesis-card p-12 text-center"
          >
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <p className="mt-3 text-[14px] text-[#6B6B6B]">
              Loading curated case study from Supabase Postgres…
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="genesis-card border-[#EF4444]/40 p-6 text-[14px] text-[#EF4444] flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {bundle && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left column: Incident + Stage Event Rail */}
            <div className="lg:col-span-4 space-y-6">
              <section className="genesis-card p-5">
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#9C9C9C] font-mono">
                  Incident Input
                </h2>
                <h3 className="mt-2 text-[17px] font-bold text-[#0A0A0A] font-display">
                  {bundle.incident.title}
                </h3>
                <div className="mt-2 font-mono text-[12px] text-[#6366F1]">
                  Repo: {bundle.incident.repository_full_name}
                </div>
                <div className="font-mono text-[12px] text-[#6B6B6B]">
                  Pinned SHA: {bundle.incident.base_sha.slice(0, 16)}
                </div>

                <div className="mt-3">
                  <div className="text-[12px] font-medium text-[#6B6B6B] mb-1.5">
                    Failing Stack Trace / Test Output:
                  </div>
                  <pre className="max-h-48 overflow-auto rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3 font-mono text-[11px] text-[#EF4444] whitespace-pre-wrap">
                    {bundle.incident.error_text_redacted}
                  </pre>
                </div>
              </section>

              <section className="genesis-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#9C9C9C] font-mono">
                    Recorded Stage Timeline
                  </h2>
                  <span className="font-mono text-[12px] text-[#9C9C9C]">
                    {bundle.events.length} events
                  </span>
                </div>

                <ol className="mt-4 space-y-3">
                  {bundle.events.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[12px] font-medium text-[#0A0A0A]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                          <span>
                            #{ev.seq} · {ev.stage}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-[#9C9C9C]">
                          {ev.event_type}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] text-[#6B6B6B] leading-relaxed">
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

              <div className="genesis-card p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-[#6366F1] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0A0A0A] font-display">
                      Want to run this exact bug through live NVIDIA Nemotron &amp; Vercel Sandbox?
                    </h3>
                    <p className="text-[13px] text-[#6B6B6B] mt-0.5">
                      Sign in and prefill the allowlisted fixture repository on the New Incident
                      screen to watch each stage execute live.
                    </p>
                  </div>
                </div>
                <Link
                  href="/app/incidents/new"
                  className="genesis-btn-secondary inline-flex h-[38px] items-center gap-2 px-4 text-[13px]"
                >
                  <Play className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
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
