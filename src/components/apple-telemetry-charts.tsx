'use client';

import React from 'react';

export function RadialRingGauge({
  value,
  max = 100,
  size = 76,
  strokeWidth = 7,
  color = '#0071E3',
  trackColor = 'rgba(0,0,0,0.06)',
  label,
  sublabel,
  displayValue,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label: string;
  sublabel?: string;
  displayValue?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="flex items-center gap-3.5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[13px] font-bold text-[#1D1D1F]">
          {displayValue ?? `${Math.round(pct * 100)}%`}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold tracking-[-0.01em] text-[#1D1D1F] leading-tight">
          {label}
        </div>
        {sublabel && (
          <div className="mt-0.5 text-[11px] text-[#515154] leading-snug">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

export function AppleBentoHeroShowcase() {
  const stageMetrics = [
    { name: '1. Pin & Fetch SHA', seconds: 0.4, pct: 10, color: '#0071E3' },
    { name: '2. Sandbox Baseline', seconds: 3.8, pct: 78, color: '#FF3B30' },
    { name: '3. Memory + Tavily Spec', seconds: 0.9, pct: 22, color: '#5E5CE6' },
    { name: '4. Nemotron Diagnosis', seconds: 2.7, pct: 58, color: '#0071E3' },
    { name: '5. Surgical Patch Gen', seconds: 2.4, pct: 52, color: '#5E5CE6' },
    { name: '6. Sandbox Green Proof', seconds: 3.9, pct: 82, color: '#28CD41' },
  ];

  return (
    <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left Dark Pro Bento Card: Apple Silicon-style NVIDIA Nemotron + Nebius Neural Die */}
      <div className="apple-dark-bento lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-[#64D2FF] uppercase">
            NEBIUS TOKEN FACTORY × NVIDIA
          </span>
          <span className="font-mono text-[11px] text-[#A1A1A6]">120B-A12B ARCHITECTURE</span>
        </div>

        {/* Custom SVG Apple Silicon-Inspired Neural Chip Graphic */}
        <div className="my-6 flex items-center justify-center">
          <svg
            viewBox="0 0 360 190"
            className="w-full max-w-[340px] h-auto"
            role="img"
            aria-label="NVIDIA Nemotron 120B Multi-Agent Neural Engine Diagram"
          >
            <defs>
              <linearGradient id="chipDieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2C2C2E" />
                <stop offset="50%" stopColor="#1C1C1E" />
                <stop offset="100%" stopColor="#0A0A0C" />
              </linearGradient>
              <linearGradient id="coreGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0071E3" />
                <stop offset="50%" stopColor="#5E5CE6" />
                <stop offset="100%" stopColor="#28CD41" />
              </linearGradient>
            </defs>

            {/* Left & Right Gold/Cyan Bus Traces */}
            {[32, 56, 80, 104, 128, 152].map((y, idx) => (
              <g key={y}>
                <line
                  x1="16"
                  y1={y}
                  x2="88"
                  y2={y}
                  stroke={idx % 2 === 0 ? '#0071E3' : '#5E5CE6'}
                  strokeWidth="1.75"
                  strokeOpacity="0.65"
                />
                <circle
                  cx="20"
                  cy={y}
                  r="3"
                  fill={idx % 2 === 0 ? '#64D2FF' : '#5E5CE6'}
                />
                <line
                  x1="272"
                  y1={y}
                  x2="344"
                  y2={y}
                  stroke={idx % 2 === 0 ? '#28CD41' : '#0071E3'}
                  strokeWidth="1.75"
                  strokeOpacity="0.65"
                />
                <circle
                  cx="340"
                  cy={y}
                  r="3"
                  fill={idx % 2 === 0 ? '#28CD41' : '#64D2FF'}
                />
              </g>
            ))}

            {/* Outer Silicon Package */}
            <rect
              x="76"
              y="14"
              width="208"
              height="162"
              rx="22"
              fill="url(#chipDieGrad)"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
            />

            {/* Inner Neural Core Frame */}
            <rect
              x="92"
              y="28"
              width="176"
              height="134"
              rx="14"
              fill="#111114"
              stroke="url(#coreGlowGrad)"
              strokeWidth="1.5"
            />

            {/* 4 Sub-Core Quadrants (Memory, Diagnose, Patch, Sandbox) */}
            <rect
              x="102"
              y="38"
              width="74"
              height="36"
              rx="6"
              fill="rgba(0,113,227,0.16)"
              stroke="rgba(100,210,255,0.35)"
            />
            <text
              x="139"
              y="54"
              textAnchor="middle"
              fill="#64D2FF"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="700"
            >
              MEMORY + TAVILY
            </text>
            <text
              x="139"
              y="66"
              textAnchor="middle"
              fill="#A1A1A6"
              fontSize="7.5"
              fontFamily="monospace"
            >
              EPISODIC RECALL
            </text>

            <rect
              x="184"
              y="38"
              width="74"
              height="36"
              rx="6"
              fill="rgba(94,92,230,0.18)"
              stroke="rgba(94,92,230,0.45)"
            />
            <text
              x="221"
              y="54"
              textAnchor="middle"
              fill="#C7C7FF"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="700"
            >
              NEMOTRON 120B
            </text>
            <text
              x="221"
              y="66"
              textAnchor="middle"
              fill="#A1A1A6"
              fontSize="7.5"
              fontFamily="monospace"
            >
              ROOT CAUSE AST
            </text>

            <rect
              x="102"
              y="114"
              width="74"
              height="36"
              rx="6"
              fill="rgba(40,205,65,0.15)"
              stroke="rgba(40,205,65,0.4)"
            />
            <text
              x="139"
              y="130"
              textAnchor="middle"
              fill="#30D158"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="700"
            >
              MICROVM PROOF
            </text>
            <text
              x="139"
              y="142"
              textAnchor="middle"
              fill="#A1A1A6"
              fontSize="7.5"
              fontFamily="monospace"
            >
              EXIT 1 → EXIT 0
            </text>

            <rect
              x="184"
              y="114"
              width="74"
              height="36"
              rx="6"
              fill="rgba(255,159,10,0.15)"
              stroke="rgba(255,159,10,0.4)"
            />
            <text
              x="221"
              y="130"
              textAnchor="middle"
              fill="#FFD60A"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="700"
            >
              SHA-256 GATE
            </text>
            <text
              x="221"
              y="142"
              textAnchor="middle"
              fill="#A1A1A6"
              fontSize="7.5"
              fontFamily="monospace"
            >
              SLSA + DRAFT PR
            </text>

            {/* Center Die Emblem */}
            <rect
              x="126"
              y="80"
              width="108"
              height="28"
              rx="14"
              fill="url(#coreGlowGrad)"
            />
            <text
              x="180"
              y="98"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="10"
              fontFamily="sans-serif"
              fontWeight="800"
              letterSpacing="0.06em"
            >
              REPOMEDIC CORE
            </text>
          </svg>
        </div>

        <div>
          <h3
            className="text-[20px] font-bold tracking-[-0.025em]"
            style={{ color: '#FFFFFF' }}
          >
            Multi-Agent Neural Repair Engine
          </h3>
          <p className="mt-1.5 text-[13px] text-[#A1A1A6] leading-relaxed">
            Combines persistent Supabase episodic memory, real-time Tavily specification citations,
            and multi-call NVIDIA Nemotron 120B inference with isolated Vercel Sandbox proof.
          </p>
        </div>
      </div>

      {/* Right Column: Apple Activity Rings + Keynote Benchmark Bar Chart */}
      <div className="lg:col-span-7 grid grid-cols-1 gap-5">
        {/* Top Bento Card: 3 Radial Activity Rings */}
        <div className="genesis-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-black/[0.06]">
            <div>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0071E3]">
                PRECISION VERIFICATION TELEMETRY
              </span>
              <h3 className="mt-0.5 text-[18px] font-bold text-[#1D1D1F] font-display">
                Deterministic Quality &amp; Safety Rings
              </h3>
            </div>
            <span className="rounded-full bg-[#ECFDF5] border border-[#10B981]/30 px-3 py-1 font-mono text-[11px] font-semibold text-[#047857]">
              ZERO UNVERIFIED DIFFS
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <RadialRingGauge
              value={100}
              max={100}
              color="#0071E3"
              displayValue="100"
              label="Surgical Score"
              sublabel="1-line nullish coalescing diff"
            />
            <RadialRingGauge
              value={6}
              max={6}
              color="#28CD41"
              displayValue="6/6"
              label="Security Gates"
              sublabel="AST, scope & secret checks"
            />
            <RadialRingGauge
              value={99.3}
              max={100}
              color="#5E5CE6"
              displayValue="99.3%"
              label="MTTR Saved"
              sublabel="45m manual → 18s verified"
            />
          </div>
        </div>

        {/* Bottom Bento Card: Apple Keynote Stage Latency & MTTR Bar Chart */}
        <div className="genesis-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/[0.06]">
            <div>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#515154]">
                END-TO-END CLOSED-LOOP BENCHMARK
              </span>
              <h3 className="mt-0.5 text-[17px] font-bold text-[#1D1D1F] font-display">
                6-Stage Autonomous Pipeline Latency Breakdown
              </h3>
            </div>
            <span className="font-mono text-[12px] font-bold text-[#0071E3]">
              14.1s Total Runtime · 146× Faster
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {stageMetrics.map((st) => (
              <div
                key={st.name}
                className="rounded-[10px] border border-black/[0.06] bg-[#F5F5F7]/70 px-3 py-2"
              >
                <div className="flex items-center justify-between text-[12px] font-medium text-[#1D1D1F]">
                  <span>{st.name}</span>
                  <span className="font-mono text-[11px] font-semibold text-[#515154]">
                    {st.seconds.toFixed(1)}s
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${st.pct}%`,
                      backgroundColor: st.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppleProofTelemetryStrip({
  surgicalScore,
  passedChecks,
  totalChecks,
  baselinePassed,
  baselineFailed,
  candidatePassed,
  candidateFailed,
  inputTokens,
  outputTokens,
  durationSeconds,
}: {
  surgicalScore: number;
  passedChecks: number;
  totalChecks: number;
  baselinePassed: number;
  baselineFailed: number;
  candidatePassed: number;
  candidateFailed: number;
  inputTokens: number;
  outputTokens: number;
  durationSeconds: number;
}) {
  const baselineTotal = Math.max(1, baselinePassed + baselineFailed);
  const candidateTotal = Math.max(1, candidatePassed + candidateFailed);
  const baselinePassPct = Math.round((baselinePassed / baselineTotal) * 100);
  const candidatePassPct = Math.round((candidatePassed / candidateTotal) * 100);
  const totalTokens = Math.max(1, inputTokens + outputTokens);
  const inputPct = Math.round((inputTokens / totalTokens) * 100);

  return (
    <div className="border-b border-black/[0.07] bg-gradient-to-b from-[#FFFFFF] to-[#F5F5F7]/60 px-4 py-5 sm:px-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-center">
        {/* Left: 2 Radial Rings */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[14px] border border-black/[0.06] bg-[#FFFFFF] p-3.5 shadow-2xs">
            <RadialRingGauge
              value={surgicalScore}
              max={100}
              size={64}
              strokeWidth={6}
              color="#0071E3"
              displayValue={`${surgicalScore}`}
              label="Surgical Precision"
              sublabel="Minimal AST blast radius"
            />
          </div>
          <div className="rounded-[14px] border border-black/[0.06] bg-[#FFFFFF] p-3.5 shadow-2xs">
            <RadialRingGauge
              value={passedChecks}
              max={totalChecks}
              size={64}
              strokeWidth={6}
              color="#28CD41"
              displayValue={`${passedChecks}/${totalChecks}`}
              label="Security Gates"
              sublabel="Zero secrets or eval()"
            />
          </div>
        </div>

        {/* Right: Visual Before/After Test Pass Bars + Token Telemetry Bar */}
        <div className="lg:col-span-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Test Suite Pass Rate Visual Comparison */}
          <div className="rounded-[14px] border border-black/[0.06] bg-[#FFFFFF] p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase text-[#515154]">
                SANDBOX TEST TRANSITION
              </span>
              <span className="font-mono text-[11px] font-bold text-[#047857]">
                {baselinePassPct}% → {candidatePassPct}% PASS
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#B91C1C]">
                <span>Baseline (Exit 1)</span>
                <span>
                  {baselinePassed}/{baselineTotal} passed ({baselineFailed} failed)
                </span>
              </div>
              <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-[#FEE2E2]">
                <div
                  className="h-full bg-[#FF3B30]"
                  style={{ width: `${Math.max(12, (baselineFailed / baselineTotal) * 100)}%` }}
                />
                <div
                  className="h-full bg-[#86868B]/40"
                  style={{ width: `${(baselinePassed / baselineTotal) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#047857]">
                <span>Patched (Exit 0)</span>
                <span>
                  {candidatePassed}/{candidateTotal} passed (0 failed)
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#DCFCE7]">
                <div
                  className="h-full rounded-full bg-[#28CD41]"
                  style={{ width: `${candidatePassPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Token & MTTR Efficiency Visual Card */}
          <div className="rounded-[14px] border border-black/[0.06] bg-[#FFFFFF] p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase text-[#515154]">
                NEMOTRON TOKEN &amp; MTTR METRICS
              </span>
              <span className="font-mono text-[11px] font-bold text-[#0071E3]">
                {durationSeconds}s Runtime
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#515154]">
                <span>Context ({inputTokens} in)</span>
                <span>Synthesis ({outputTokens} out)</span>
              </div>
              <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-[#F5F5F7]">
                <div
                  className="h-full bg-[#0071E3]"
                  style={{ width: `${inputPct}%` }}
                />
                <div
                  className="h-full bg-[#5E5CE6]"
                  style={{ width: `${100 - inputPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[#047857]">
              <span>On-Call Time Saved:</span>
              <span className="font-bold">~44m 42s per incident (99.3%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
