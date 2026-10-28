'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Code2,
  Copy,
  FileJson,
  Layers,
  ListOrdered,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import { ProofOfFixPanel } from '@/components/proof-of-fix-panel';
import type { CompleteRunBundle } from '@/lib/supabase/types';

type DemoTab = 'split' | 'proof' | 'timeline' | 'attestation';

export default function DemoCaseStudyPage() {
  const [bundle, setBundle] = useState<CompleteRunBundle | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DemoTab>('split');
  const [attestationJson, setAttestationJson] = useState<string | null>(null);
  const [copiedAttestation, setCopiedAttestation] = useState(false);

  async function loadDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo');
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

  async function loadAttestationIfNeeded(runId: string) {
    if (attestationJson) return;
    try {
      const res = await fetch(`/api/runs/${runId}/attestation`, { cache: 'no-store' });
      const data = await res.json();
      setAttestationJson(JSON.stringify(data, null, 2));
    } catch {
      setAttestationJson('{"error": "Failed to load attestation"}');
    }
  }

  function handleCopyAttestation() {
    if (!attestationJson) return;
    navigator.clipboard.writeText(attestationJson);
    setCopiedAttestation(true);
    setTimeout(() => setCopiedAttestation(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 space-y-6">
        {/* Provenance Notice Banner */}
        <div className="genesis-card border-[#F59E0B]/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 shrink-0 text-[#B45309] mt-0.5" aria-hidden="true" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[20px] font-bold text-[#0A0A0A] font-display">
                    Judge Inspection View — Recorded Case Study vs. Live Investigation
                  </h1>
                  <span className="rounded-full border border-[#B45309]/30 bg-[#FFFBEB] px-3 py-1 font-mono text-[11px] font-semibold text-[#B45309]">
                    READ-ONLY RECORDED CASE STUDY
                  </span>
                </div>
                <p className="mt-1.5 text-[14px] text-[#52525B] max-w-3xl leading-relaxed">
                  {disclaimer ||
                    'Below is a curated, read-only case study stored in Supabase (is_demo=true) so judges can inspect a complete Proof of Fix immediately without signing in. To execute a fresh runtime call to Nebius Token Factory + Vercel Sandbox, click "Run Live Investigation".'}
                </p>
              </div>
            </div>

            <Link
              href="/app/incidents/new"
              className="genesis-btn-primary inline-flex min-h-[44px] sm:min-h-[38px] items-center gap-2 px-4 text-[13px] shrink-0"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Run Live Investigation</span>
            </Link>
          </div>

          {/* Interactive Feature Tabs for Case Study Inspection */}
          {bundle && (
            <div
              role="tablist"
              aria-label="Case Study Feature Views"
              className="mt-5 flex flex-wrap gap-1.5 rounded-[10px] border border-[#E8E8EC] bg-[#FAFAFA] p-1.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'split'}
                onClick={() => setActiveTab('split')}
                className={`inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-2 text-[13px] font-medium transition-all ${
                  activeTab === 'split'
                    ? 'bg-[#6366F1] text-[#FFFFFF] shadow-xs'
                    : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>All-in-One Workspace</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'proof'}
                onClick={() => setActiveTab('proof')}
                className={`inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-2 text-[13px] font-medium transition-all ${
                  activeTab === 'proof'
                    ? 'bg-[#6366F1] text-[#FFFFFF] shadow-xs'
                    : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Proof of Fix &amp; Security Audit</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'timeline'}
                onClick={() => setActiveTab('timeline')}
                className={`inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-2 text-[13px] font-medium transition-all ${
                  activeTab === 'timeline'
                    ? 'bg-[#6366F1] text-[#FFFFFF] shadow-xs'
                    : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
                }`}
              >
                <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Stage Event Stream ({bundle.events.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'attestation'}
                onClick={() => {
                  setActiveTab('attestation');
                  loadAttestationIfNeeded(bundle.run.id);
                }}
                className={`inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-2 text-[13px] font-medium transition-all ${
                  activeTab === 'attestation'
                    ? 'bg-[#6366F1] text-[#FFFFFF] shadow-xs'
                    : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
                }`}
              >
                <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                <span>SLSA Attestation JSON</span>
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div role="status" aria-live="polite" className="genesis-card p-12 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <p className="mt-3 text-[14px] text-[#52525B]">
              Loading curated case study from Supabase Postgres…
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="genesis-card border-[#EF4444]/40 p-6 text-[14px] text-[#B91C1C] flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {bundle && activeTab === 'split' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left column: Incident + Stage Event Rail */}
            <div className="lg:col-span-4 space-y-6">
              <section className="genesis-card p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#52525B] font-mono">
                  Incident Input
                </h2>
                <h3 className="mt-2 text-[17px] font-bold text-[#0A0A0A] font-display">
                  {bundle.incident.title}
                </h3>
                <div className="mt-2 font-mono text-[12px] text-[#4F46E5] font-medium">
                  Repo: {bundle.incident.repository_full_name}
                </div>
                <div className="font-mono text-[12px] text-[#52525B]">
                  Pinned SHA: {bundle.incident.base_sha.slice(0, 16)}
                </div>

                <div className="mt-3">
                  <div className="text-[12px] font-medium text-[#52525B] mb-1.5">
                    Failing Stack Trace / Test Output:
                  </div>
                  <pre className="max-h-48 overflow-auto rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-3 font-mono text-[11px] text-[#B91C1C] whitespace-pre-wrap">
                    {bundle.incident.error_text_redacted}
                  </pre>
                </div>
              </section>

              <section className="genesis-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#52525B] font-mono">
                    Recorded Stage Timeline
                  </h2>
                  <span className="font-mono text-[12px] text-[#52525B]">
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
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                          <span>
                            #{ev.seq} · {ev.stage}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-[#52525B]">
                          {ev.event_type}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] text-[#52525B] leading-relaxed">
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
                  <ShieldAlert
                    className="h-5 w-5 text-[#6366F1] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0A0A0A] font-display">
                      Want to run this exact bug through live NVIDIA Nemotron &amp; Vercel Sandbox?
                    </h3>
                    <p className="text-[13px] text-[#52525B] mt-0.5">
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

        {bundle && activeTab === 'proof' && (
          <ProofOfFixPanel bundle={bundle} isRecordedDemo={true} showReviewLink={false} />
        )}

        {bundle && activeTab === 'timeline' && (
          <section className="genesis-card p-6 space-y-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#0A0A0A] font-display">
                Complete Stage Event Stream &amp; Structured Payloads
              </h2>
              <p className="text-[13px] text-[#52525B]">
                Every stage transition is appended atomically via PostgreSQL RPC{' '}
                <code className="font-mono">append_run_event</code> with monotonic sequence numbers.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {bundle.events.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold text-[#0A0A0A]">
                      <CheckCircle2 className="h-4 w-4 text-[#047857]" aria-hidden="true" />
                      <span>
                        Event #{ev.seq} · {ev.stage}
                      </span>
                    </span>
                    <span className="rounded bg-[#6366F1]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#4F46E5]">
                      {ev.event_type}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#0A0A0A] leading-relaxed">{ev.summary}</p>
                  <pre className="overflow-x-auto rounded border border-[#E8E8EC] bg-[#FFFFFF] p-2.5 font-mono text-[11px] text-[#52525B]">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        {bundle && activeTab === 'attestation' && (
          <section className="genesis-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#047857]" aria-hidden="true" />
                  <h2 className="text-[18px] font-bold text-[#0A0A0A] font-display">
                    Cryptographic SLSA-Style Proof-of-Fix Attestation Bundle
                  </h2>
                </div>
                <p className="mt-1 text-[13px] text-[#52525B]">
                  Machine-verifiable JSON attestation generated by{' '}
                  <code className="font-mono">GET /api/runs/{bundle.run.id}/attestation</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyAttestation}
                className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px]"
              >
                <Copy className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                <span>{copiedAttestation ? 'Copied JSON!' : 'Copy Attestation JSON'}</span>
              </button>
            </div>
            <pre className="max-h-[520px] overflow-auto rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4 font-mono text-[12px] text-[#0A0A0A]">
              {attestationJson || 'Loading cryptographic attestation bundle…'}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}
