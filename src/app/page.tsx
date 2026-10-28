import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileCheck2,
  GitPullRequestDraft,
  Lock,
  Terminal,
} from 'lucide-react';
import { NavHeader } from '@/components/nav-header';
import { RepoMedicLogo } from '@/components/repomedic-logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />

      <main className="flex-1">
        {/* Hero section with Genesis interactive dot grid */}
        <section className="relative border-b border-[#E8E8EC] bg-[#FAFAFA] genesis-dot-grid py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#E8E8EC] bg-[#FFFFFF] px-3.5 py-1 text-[12px] font-medium text-[#52525B]">
              <Cpu className="h-3.5 w-3.5 text-[#4F46E5]" aria-hidden="true" />
              <span>Nebius Token Factory × NVIDIA Nemotron · Autonomous Incident Repair</span>
              <span className="font-mono text-[11px] font-semibold text-[#15803D]">
                DESIGN.md Genesis
              </span>
            </div>

            <h1 className="mt-6 max-w-4xl text-3xl font-bold tracking-[-0.04em] text-[#0A0A0A] sm:text-5xl lg:text-[60px] leading-[1.08] font-display">
              Turn production exceptions into{' '}
              <span className="text-[#4F46E5]">test-backed draft pull requests</span>.
            </h1>

            <p className="mt-6 max-w-2xl text-[15px] sm:text-[17px] text-[#52525B] leading-relaxed">
              RepoMedic fetches a pinned commit, diagnoses the exact failing code path with NVIDIA
              Nemotron via Nebius Token Factory, generates a minimal surgical patch, and proves the
              fix in an isolated Vercel Sandbox before you approve a draft GitHub PR.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                className="genesis-btn-primary inline-flex h-[44px] items-center gap-2 px-6 text-[14px]"
              >
                <span>Open Live Demo &amp; Case Study</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/app/incidents/new"
                className="genesis-btn-secondary inline-flex h-[44px] items-center gap-2 px-6 text-[14px]"
              >
                <Terminal className="h-4 w-4 text-[#4F46E5]" aria-hidden="true" />
                <span>Investigate Live Incident</span>
              </Link>
            </div>

            {/* Technology & Governance Strip */}
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="genesis-card genesis-card-interactive p-5">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#52525B]">
                  AI Inference
                </div>
                <div className="mt-1.5 text-[16px] font-bold text-[#0A0A0A] font-display">
                  NVIDIA Nemotron
                </div>
                <div className="mt-1 text-[13px] text-[#52525B] leading-relaxed">
                  Direct Nebius Token Factory API with strict Zod schema validation
                </div>
              </div>

              <div className="genesis-card genesis-card-interactive p-5">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#047857]">
                  Isolated Runner
                </div>
                <div className="mt-1.5 text-[16px] font-bold text-[#0A0A0A] font-display">
                  Vercel Sandbox SDK
                </div>
                <div className="mt-1 text-[13px] text-[#52525B] leading-relaxed">
                  Ephemeral microVMs for baseline red &amp; patched green proofs
                </div>
              </div>

              <div className="genesis-card genesis-card-interactive p-5">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#52525B]">
                  State &amp; Security
                </div>
                <div className="mt-1.5 text-[16px] font-bold text-[#0A0A0A] font-display">
                  Supabase Postgres + RLS
                </div>
                <div className="mt-1 text-[13px] text-[#52525B] leading-relaxed">
                  Row-level ownership, atomic stage locks, secret redaction
                </div>
              </div>

              <div className="genesis-card genesis-card-interactive p-5">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#B45309]">
                  Write Safety
                </div>
                <div className="mt-1.5 text-[16px] font-bold text-[#0A0A0A] font-display">
                  SHA-256 Approval Gate
                </div>
                <div className="mt-1 text-[13px] text-[#52525B] leading-relaxed">
                  Human sign-off on exact diff hash; draft PRs only, zero auto-merge
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closed-Loop Workflow Section */}
        <section className="py-12 sm:py-16 border-b border-[#E8E8EC] bg-[#FAFAFA]">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.03em] text-[#0A0A0A] font-display">
                Auditable Closed-Loop Engineering Workflow
              </h2>
              <p className="mt-2 text-[15px] text-[#6B6B6B]">
                Every stage is persisted in Supabase with real exit codes, durations, and model
                telemetry. No simulated terminal streams or unverified code suggestions.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-5">
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
                  className="genesis-card genesis-card-interactive p-5 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#52525B]">
                      STAGE {item.step}
                    </span>
                    <h3 className="mt-2 text-[17px] font-bold text-[#0A0A0A] font-display">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#52525B]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Example Proof Preview Strip */}
        <section className="py-12 sm:py-16 bg-[#FAFAFA]">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <div className="genesis-card p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E8EC] pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 px-3 py-1 font-mono text-[12px] font-medium text-[#10B981]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>DETERMINISTIC VERIFICATION PREVIEW</span>
                  </span>
                  <h2 className="mt-2 text-[24px] font-bold text-[#0A0A0A] font-display">
                    What Judges &amp; Engineers See in Every Proof of Fix
                  </h2>
                </div>
                <Link
                  href="/demo"
                  className="genesis-btn-secondary inline-flex h-[38px] items-center gap-1.5 px-4 text-[13px]"
                >
                  <span>Inspect Full Case Study</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[#EF4444] font-mono">
                    <span>BASELINE RUN (BEFORE PATCH)</span>
                  </div>
                  <p className="mt-2 font-mono text-[12px] text-[#6B6B6B]">
                    $ npx vitest run → <strong className="text-[#EF4444]">Exit Code 1</strong>
                  </p>
                  <p className="mt-1 font-mono text-[12px] text-[#6B6B6B]">
                    7 passed, 1 failed (`tests/pricing.test.ts:63`)
                  </p>
                </div>

                <div className="rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] p-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[#0A0A0A] font-mono">
                    <span>MINIMAL UNIFIED DIFF</span>
                  </div>
                  <pre className="mt-2 font-mono text-[12px] leading-relaxed overflow-x-auto">
                    <span className="text-[#EF4444] block">
                      - const effective = taxRatePercent || defaultRatePercent;
                    </span>
                    <span className="text-[#10B981] font-medium block">
                      + const effective = taxRatePercent ?? defaultRatePercent;
                    </span>
                  </pre>
                </div>

                <div className="rounded-[8px] border border-[#10B981]/35 bg-[#FAFAFA] p-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[#10B981] font-mono">
                    <span>CANDIDATE RUN (AFTER PATCH)</span>
                  </div>
                  <p className="mt-2 font-mono text-[12px] text-[#6B6B6B]">
                    $ npx vitest run → <strong className="text-[#10B981]">Exit Code 0</strong>
                  </p>
                  <p className="mt-1 font-mono text-[12px] text-[#10B981] font-medium">
                    8 passed, 0 failed (Verified in isolated microVM)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8E8EC] bg-[#FFFFFF] py-8">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#52525B]">
          <div className="flex items-center gap-3">
            <RepoMedicLogo size="sm" showTagline={false} />
            <span>— Autonomous Production Incident Investigator (MIT License)</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[12px]">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3 text-[#10B981]" aria-hidden="true" />
              Server-Only Credentials
            </span>
            <span className="inline-flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-[#6366F1]" aria-hidden="true" />
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
