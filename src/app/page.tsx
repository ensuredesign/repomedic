import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileCheck2,
  GitPullRequestDraft,
  Lock,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1017] text-[#F2F7FB]">
      <NavHeader />

      <main className="flex-1">
        {/* Hero section */}
        <section className="relative border-b border-[#9EB0C1]/15 bg-gradient-to-b from-[#111923] to-[#0B1017] py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#28C8DB]/35 bg-[#182331] px-3.5 py-1 text-xs font-medium text-[#28C8DB]">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Nebius Token Factory × NVIDIA Nemotron · Autonomous Incident Repair</span>
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-[#F2F7FB] sm:text-5xl lg:text-6xl leading-[1.1]">
              Turn production exceptions into{' '}
              <span className="text-[#28C8DB]">test-backed draft pull requests</span>.
            </h1>

            <p className="mt-6 max-w-2xl text-base sm:text-lg text-[#9EB0C1] leading-relaxed">
              RepoMedic fetches a pinned commit, diagnoses the exact failing code path with NVIDIA
              Nemotron via Nebius Token Factory, generates a minimal surgical patch, and proves the
              fix in an isolated Vercel Sandbox before you approve a draft GitHub PR.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-xl bg-[#28C8DB] px-6 py-3.5 text-sm font-semibold text-[#0B1017] shadow-sm hover:bg-[#21BD9D] transition-colors"
              >
                <span>Open Live Demo &amp; Case Study</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/app/incidents/new"
                className="inline-flex items-center gap-2 rounded-xl border border-[#9EB0C1]/30 bg-[#111923] px-6 py-3.5 text-sm font-semibold text-[#F2F7FB] hover:border-[#28C8DB]/60 hover:text-[#28C8DB] transition-colors"
              >
                <Terminal className="h-4 w-4" aria-hidden="true" />
                <span>Investigate Live Incident</span>
              </Link>
            </div>

            {/* Technology & Governance Strip */}
            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[#9EB0C1]/15 bg-[#111923]/90 p-4">
                <div className="font-mono text-xs uppercase tracking-wider text-[#28C8DB]">
                  AI Inference
                </div>
                <div className="mt-1 text-sm font-semibold text-[#F2F7FB]">
                  NVIDIA Nemotron
                </div>
                <div className="mt-0.5 text-xs text-[#9EB0C1]">
                  Direct Nebius Token Factory API with Zod schema validation
                </div>
              </div>

              <div className="rounded-xl border border-[#9EB0C1]/15 bg-[#111923]/90 p-4">
                <div className="font-mono text-xs uppercase tracking-wider text-[#21BD9D]">
                  Isolated Runner
                </div>
                <div className="mt-1 text-sm font-semibold text-[#F2F7FB]">
                  Vercel Sandbox SDK
                </div>
                <div className="mt-0.5 text-xs text-[#9EB0C1]">
                  Ephemeral microVMs for baseline red &amp; patched green proofs
                </div>
              </div>

              <div className="rounded-xl border border-[#9EB0C1]/15 bg-[#111923]/90 p-4">
                <div className="font-mono text-xs uppercase tracking-wider text-[#28C8DB]">
                  State &amp; Security
                </div>
                <div className="mt-1 text-sm font-semibold text-[#F2F7FB]">
                  Supabase Postgres + RLS
                </div>
                <div className="mt-0.5 text-xs text-[#9EB0C1]">
                  Row-level ownership, atomic stage locks, secret redaction
                </div>
              </div>

              <div className="rounded-xl border border-[#9EB0C1]/15 bg-[#111923]/90 p-4">
                <div className="font-mono text-xs uppercase tracking-wider text-[#F59E0B]">
                  Write Safety
                </div>
                <div className="mt-1 text-sm font-semibold text-[#F2F7FB]">
                  SHA-256 Approval Gate
                </div>
                <div className="mt-0.5 text-xs text-[#9EB0C1]">
                  Human sign-off on exact diff hash; draft PRs only, zero auto-merge
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closed-Loop Workflow Section */}
        <section className="py-16 border-b border-[#9EB0C1]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-[#F2F7FB] sm:text-3xl">
                Auditable Closed-Loop Engineering Workflow
              </h2>
              <p className="mt-2 text-sm text-[#9EB0C1]">
                Every stage is persisted in Supabase with real exit codes, durations, and model
                telemetry. No simulated terminal streams or unverified code suggestions.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-5">
              {[
                {
                  step: '01',
                  title: 'Pin & Ingest',
                  desc: 'Validates allowlisted repository and fetches source files at a pinned commit SHA with path traversal protection.',
                },
                {
                  step: '02',
                  title: 'Baseline Reproduction',
                  desc: 'Executes the unmodified test suite in a clean Vercel Sandbox to confirm the exact failure exit code.',
                },
                {
                  step: '03',
                  title: 'Nemotron Diagnosis',
                  desc: 'Calls NVIDIA Nemotron on Nebius Token Factory to isolate root cause, line numbers, and a minimal repair plan.',
                },
                {
                  step: '04',
                  title: 'Patch & Verify (≤2x)',
                  desc: 'Applies a surgical diff in an isolated sandbox and re-runs the identical test command (with up to 1 reflection retry).',
                },
                {
                  step: '05',
                  title: 'Gated Draft PR',
                  desc: 'Presents Proof of Fix. Only after explicit human approval of the SHA-256 diff hash does it open a draft PR.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-[#9EB0C1]/20 bg-[#111923] p-5 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-semibold text-[#28C8DB]">
                      STAGE {item.step}
                    </span>
                    <h3 className="mt-2 text-base font-semibold text-[#F2F7FB]">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#9EB0C1]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Example Proof Preview Strip */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-[#9EB0C1]/20 bg-[#111923] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#9EB0C1]/15 pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#21BD9D]/15 px-3 py-1 font-mono text-xs font-medium text-[#21BD9D]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>DETERMINISTIC VERIFICATION PREVIEW</span>
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-[#F2F7FB]">
                    What Judges &amp; Engineers See in Every Proof of Fix
                  </h2>
                </div>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#182331] border border-[#28C8DB]/40 px-4 py-2 text-xs font-semibold text-[#28C8DB] hover:bg-[#28C8DB] hover:text-[#0B1017] transition-colors"
                >
                  <span>Inspect Full Case Study</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-[#9EB0C1]/15 bg-[#0B1017] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F43F5E] font-mono">
                    <span>BASELINE RUN (BEFORE PATCH)</span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-[#9EB0C1]">
                    $ npx vitest run → <strong className="text-[#F43F5E]">Exit Code 1</strong>
                  </p>
                  <p className="mt-1 font-mono text-xs text-[#9EB0C1]">
                    7 passed, 1 failed (`tests/pricing.test.ts:63`)
                  </p>
                </div>

                <div className="rounded-xl border border-[#9EB0C1]/15 bg-[#0B1017] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#28C8DB] font-mono">
                    <span>MINIMAL UNIFIED DIFF</span>
                  </div>
                  <pre className="mt-2 font-mono text-xs leading-relaxed overflow-x-auto">
                    <span className="text-[#F43F5E] block">
                      - const effective = taxRatePercent || defaultRatePercent;
                    </span>
                    <span className="text-[#21BD9D] block">
                      + const effective = taxRatePercent ?? defaultRatePercent;
                    </span>
                  </pre>
                </div>

                <div className="rounded-xl border border-[#21BD9D]/30 bg-[#0B1017] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#21BD9D] font-mono">
                    <span>CANDIDATE RUN (AFTER PATCH)</span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-[#9EB0C1]">
                    $ npx vitest run → <strong className="text-[#21BD9D]">Exit Code 0</strong>
                  </p>
                  <p className="mt-1 font-mono text-xs text-[#21BD9D]">
                    8 passed, 0 failed (Verified in isolated microVM)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#9EB0C1]/15 bg-[#0B1017] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-[#9EB0C1]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#28C8DB]" aria-hidden="true" />
            <span>RepoMedic — Diagnose. Patch. Prove. (MIT License)</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3 text-[#21BD9D]" aria-hidden="true" />
              Server-Only Credentials
            </span>
            <span className="inline-flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-[#28C8DB]" aria-hidden="true" />
              Supabase RLS Enforced
            </span>
            <span className="inline-flex items-center gap-1">
              <GitPullRequestDraft className="h-3 w-3 text-[#F59E0B]" aria-hidden="true" />
              Approval-Gated Draft PRs
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
