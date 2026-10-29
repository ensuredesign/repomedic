import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

// Exact voiceover durations from manifest (fps = 30):
// chapter1: 20.81s (625f) -> start 12f, next at 652f
// chapter2: 21.17s (636f) -> start 652f, next at 1304f
// chapter3: 26.40s (792f) -> start 1304f, next at 2112f
// chapter4: 25.56s (767f) -> start 2112f, next at 2895f
// chapter5: 25.78s (774f) -> start 2895f, next at 3685f
// chapter6: 27.36s (821f) -> start 3685f, end at 4530f (151.0s = 2m 31s)

export const TOTAL_DURATION_FRAMES = 4530; // 151.0 seconds (2m 31s — comfortably under 3 minutes)
const TRANSITION_FRAMES = 18;

const CHAPTER_MARKERS = [
  { num: '01', label: 'PROBLEM', start: 0, end: 652 },
  { num: '02', label: 'IDEA', start: 652, end: 1304 },
  { num: '03', label: 'TECH STACK', start: 1304, end: 2112 },
  { num: '04', label: 'WALKTHROUGH', start: 2112, end: 2895 },
  { num: '05', label: 'SANDBOX & TRACE', start: 2895, end: 3685 },
  { num: '06', label: 'IMPACT', start: 3685, end: 4530 },
];

const TopChapterRail: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: 'absolute',
        top: 22,
        left: 44,
        right: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          borderRadius: 999,
          backgroundColor: 'rgba(15, 17, 26, 0.84)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Img
          src={staticFile('repomedic-logo-square.png')}
          style={{ width: 24, height: 24, borderRadius: 6 }}
        />
        <span
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
          }}
        >
          RepoMedic
        </span>
        <span
          style={{
            fontFamily: 'Consolas, monospace',
            fontSize: 11,
            fontWeight: 600,
            color: '#34D399',
            letterSpacing: '0.06em',
          }}
        >
          NEBIUS × NVIDIA
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 999,
          backgroundColor: 'rgba(15, 17, 26, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {CHAPTER_MARKERS.map((ch) => {
          const active = frame >= ch.start && frame < ch.end;
          return (
            <div
              key={ch.num}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                backgroundColor: active ? '#4F46E5' : 'transparent',
                color: active ? '#FFFFFF' : 'rgba(255,255,255,0.52)',
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.04em',
              }}
            >
              {ch.num} {ch.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface KeynoteVisualStageProps {
  imageFile: string;
  badgeTitle: string;
  badgeMetric: string;
  accentColor?: string;
}

/**
 * Full-frame Ultra Keynote Visual Stage — 100% locked scale(1) (ZERO zoom-in shake!)
 * Uses pure opacity + subtle floating glass pill entrance with spring physics.
 */
const KeynoteVisualStage: React.FC<KeynoteVisualStageProps> = ({
  imageFile,
  badgeTitle,
  badgeMetric,
  accentColor = '#34D399',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pillEnter = spring({
    frame: frame - 8,
    fps,
    config: { damping: 200, stiffness: 120 },
  });

  const pillY = interpolate(pillEnter, [0, 1], [-18, 0]);
  const pillOpacity = interpolate(pillEnter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#090B10' }}>
      {/* Stationary 1:1 pixel-locked image — zero zoom, zero shake */}
      <Img
        src={staticFile(`slides/${imageFile}`)}
        style={{
          width: 1920,
          height: 1080,
          objectFit: 'cover',
        }}
      />

      {/* Subtle top vignette for header legibility (never touching bottom) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 150,
          background: 'linear-gradient(180deg, rgba(7,9,14,0.68) 0%, rgba(7,9,14,0) 100%)',
        }}
      />

      {/* Spring-animated floating top-left telemetry badge (ZERO bottom captions) */}
      <div
        style={{
          position: 'absolute',
          top: 78,
          left: 44,
          opacity: pillOpacity,
          transform: `translate3d(0px, ${pillY}px, 0px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 18px',
          borderRadius: 14,
          backgroundColor: 'rgba(13, 16, 26, 0.86)',
          border: `1px solid ${accentColor}55`,
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.38)',
        }}
      >
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            backgroundColor: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
          }}
        />
        <span
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: '#FFFFFF',
          }}
        >
          {badgeTitle}
        </span>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            backgroundColor: `${accentColor}22`,
            color: accentColor,
            fontFamily: 'Consolas, monospace',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {badgeMetric}
        </span>
      </div>
    </AbsoluteFill>
  );
};

interface MacBrowserStageProps {
  imageFile: string;
  urlPath: string;
  calloutTitle: string;
  calloutBadge: string;
  accentColor?: string;
}

/**
 * Stationary Apple Cupertino macOS Browser Frame — 100% locked scale(1) (ZERO zoom-in shake!)
 * Renders the crisp 1920x1080 screenshot inside a precision macOS window bezel with spring-animated callouts.
 */
const MacBrowserStage: React.FC<MacBrowserStageProps> = ({
  imageFile,
  urlPath,
  calloutTitle,
  calloutBadge,
  accentColor = '#0071E3',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cardEnter = spring({
    frame: frame - 6,
    fps,
    config: { damping: 200, stiffness: 130 },
  });

  const badgeSlide = interpolate(cardEnter, [0, 1], [20, 0]);
  const badgeOpacity = interpolate(cardEnter, [0, 1], [0, 1]);

  // Smooth progress bar inside browser chrome
  const progressPct = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.linear,
  });

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at 50% 20%, #1E2238 0%, #0D0F18 65%, #08090F 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 78,
      }}
    >
      {/* Stationary Cupertino Browser Bezel (1792 x 972) — zero scale animation so text is razor-sharp */}
      <div
        style={{
          width: 1792,
          height: 972,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.55)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* macOS Safari Top Bar */}
        <div
          style={{
            height: 44,
            backgroundColor: '#F5F5F7',
            borderBottom: '1px solid #E5E5EA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px',
            position: 'relative',
          }}
        >
          {/* Traffic Lights */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5F56' }} />
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFBD2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#27C93F' }} />
          </div>

          {/* Centered URL Pill */}
          <div
            style={{
              padding: '5px 22px',
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              fontFamily: 'Consolas, monospace',
              fontSize: 12,
              fontWeight: 600,
              color: '#1D1D1F',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#10B981' }}>●</span>
            <span>https://repomedic-eta.vercel.app{urlPath}</span>
          </div>

          {/* Right Callout Pill inside Browser Header (Zero bottom captions!) */}
          <div
            style={{
              opacity: badgeOpacity,
              transform: `translate3d(${badgeSlide}px, 0px, 0px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                color: '#1D1D1F',
              }}
            >
              {calloutTitle}
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                backgroundColor: accentColor,
                color: '#FFFFFF',
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {calloutBadge}
            </span>
          </div>

          {/* Subtle scene progress hairline */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 2,
              width: `${progressPct}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>

        {/* Crisp 16:9 Viewport Content — ZERO scaling/zooming, 100% steady */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#FAFAFA' }}>
          <Img
            src={staticFile(`slides/${imageFile}`)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const RepoMedicDemo: React.FC = () => {
  // 15 transitions * 18 frames = 270 frames overlap across 16 sequences.
  // Sum of sequence durations = 4530 + 270 = 4800 frames -> exact net output = 4530 frames (151.0s).
  return (
    <AbsoluteFill style={{ backgroundColor: '#08090F' }}>
      {/* Top Persistent Chapter Progress Rail */}
      <TopChapterRail />

      {/* Frame-Accurate Natural Studio Voiceover Tracks */}
      <Sequence from={12}>
        <Audio src={staticFile('audio/chapter1.mp3')} volume={1} />
      </Sequence>
      <Sequence from={652}>
        <Audio src={staticFile('audio/chapter2.mp3')} volume={1} />
      </Sequence>
      <Sequence from={1304}>
        <Audio src={staticFile('audio/chapter3.mp3')} volume={1} />
      </Sequence>
      <Sequence from={2112}>
        <Audio src={staticFile('audio/chapter4.mp3')} volume={1} />
      </Sequence>
      <Sequence from={2895}>
        <Audio src={staticFile('audio/chapter5.mp3')} volume={1} />
      </Sequence>
      <Sequence from={3685}>
        <Audio src={staticFile('audio/chapter6.mp3')} volume={1} />
      </Sequence>

      {/* 16-Scene Smooth TransitionSeries (Zero Zoom-In Shake!) */}
      <TransitionSeries>
        {/* CHAPTER 1: PROBLEM STATEMENT (0f -> 652f) */}
        <TransitionSeries.Sequence durationInFrames={340}>
          <KeynoteVisualStage
            imageFile="scene1-problem.jpg"
            badgeTitle="3:00 AM Production Exception Bottleneck"
            badgeMetric="45m Manual Triage · Unverified AI Diffs"
            accentColor="#EF4444"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={330}>
          <MacBrowserStage
            imageFile="01-landing-hero.png"
            urlPath="/"
            calloutTitle="Cupertino Silicon Telemetry"
            calloutBadge="45m → 18s Proof"
            accentColor="#4F46E5"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* CHAPTER 2: THE IDEA (652f -> 1304f) */}
        <TransitionSeries.Sequence durationInFrames={345}>
          <KeynoteVisualStage
            imageFile="scene2-idea.jpg"
            badgeTitle="RepoMedic — Closed-Loop Autonomous Repair"
            badgeMetric="Diagnose · Patch · Prove"
            accentColor="#10B981"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={343}>
          <MacBrowserStage
            imageFile="02-landing-workflow.png"
            urlPath="/#workflow"
            calloutTitle="5-Stage Deterministic Pipeline"
            calloutBadge="Red → Green Sandbox"
            accentColor="#10B981"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* CHAPTER 3: TECHNOLOGIES USED (1304f -> 2112f) */}
        <TransitionSeries.Sequence durationInFrames={290}>
          <KeynoteVisualStage
            imageFile="scene3-tech-stack.jpg"
            badgeTitle="Nebius Token Factory × NVIDIA Nemotron 120B"
            badgeMetric="ConTree SDK · LangSmith · Tavily · Supabase RLS"
            accentColor="#818CF8"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={280}>
          <MacBrowserStage
            imageFile="02b-landing-pillars.png"
            urlPath="/#architecture"
            calloutTitle="4-Pillar Hackathon Architecture"
            calloutBadge="Multi-Step Agent"
            accentColor="#4F46E5"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={292}>
          <MacBrowserStage
            imageFile="05-new-incident-ingestion.png"
            urlPath="/app/incidents/new"
            calloutTitle="Pinned SHA & Allowlisted Repo Ingestion"
            calloutBadge="ensuredesign/repomedic-fixture"
            accentColor="#0071E3"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* CHAPTER 4: LIVE APP WALKTHROUGH PART 1 (2112f -> 2895f) */}
        <TransitionSeries.Sequence durationInFrames={205}>
          <MacBrowserStage
            imageFile="03-auth-portal.png"
            urlPath="/auth"
            calloutTitle="1-Click Judge Login & Resend Welcome Email"
            calloutBadge="Supabase RLS"
            accentColor="#4F46E5"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={205}>
          <MacBrowserStage
            imageFile="04-dashboard-command-center.png"
            urlPath="/app"
            calloutTitle="Live Incident Command Center"
            calloutBadge="3 Verified Runs"
            accentColor="#10B981"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={210}>
          <MacBrowserStage
            imageFile="06-proof-5stage-pipeline.png"
            urlPath="/demo"
            calloutTitle="Nemotron Root-Cause Localization"
            calloutBadge="src/pricing.ts:44"
            accentColor="#4F46E5"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={235}>
          <MacBrowserStage
            imageFile="07-proof-diff-and-sandbox.png"
            urlPath="/demo#proof-of-fix"
            calloutTitle="Deterministic Before/After Proof"
            calloutBadge="Exit 1 → Exit 0"
            accentColor="#10B981"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* CHAPTER 5: NEBIUS SANDBOXES, LANGSMITH & CO-PILOT (2895f -> 3685f) */}
        <TransitionSeries.Sequence durationInFrames={200}>
          <MacBrowserStage
            imageFile="07b-security-scanner.png"
            urlPath="/demo#security-audit"
            calloutTitle="6-Check Static Security & Blast-Radius Audit"
            calloutBadge="100/100 Score"
            accentColor="#10B981"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={225}>
          <MacBrowserStage
            imageFile="08-proof-nebius-contree-sandbox.png"
            urlPath="/demo#nebius-sandbox-section"
            calloutTitle="Nebius Token Factory Sandboxes (contree-sdk)"
            calloutBadge="3-Step CoW + QR"
            accentColor="#10B981"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={225}>
          <MacBrowserStage
            imageFile="09-proof-langsmith-trace.png"
            urlPath="/demo#langsmith-trace-section"
            calloutTitle="LangSmith 6-Span Trace & Online Evaluators"
            calloutBadge="4/4 Score 1.00"
            accentColor="#0071E3"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={212}>
          <MacBrowserStage
            imageFile="10-proof-copilot-and-tavily.png"
            urlPath="/demo#nemotron-copilot"
            calloutTitle="Episodic Memory & Tavily Live Grounding"
            calloutBadge="Nemotron Co-Pilot"
            accentColor="#4F46E5"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* CHAPTER 6: GOVERNANCE & IMPACT (3685f -> 4530f) */}
        <TransitionSeries.Sequence durationInFrames={410}>
          <MacBrowserStage
            imageFile="11-admin-control-plane.png"
            urlPath="/admin"
            calloutTitle="SHA-256 Approval Gate & Admin Control Plane"
            calloutBadge="RBAC + Draft PR #4"
            accentColor="#0071E3"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={471}>
          <KeynoteVisualStage
            imageFile="scene6-impact.jpg"
            badgeTitle="RepoMedic — Verified Autonomous Incident Repair"
            badgeMetric="99.3% Faster MTTR (45m → 18s)"
            accentColor="#10B981"
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
