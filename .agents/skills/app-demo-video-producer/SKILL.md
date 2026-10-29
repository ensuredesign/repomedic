---
name: app-demo-video-producer
description: Produces broadcast-grade 1080p app demo videos for hackathon submissions by combining Ultra AI keynote visuals, Playwright 1920x1080 live browser walkthrough recordings, studio neural voiceover synthesis (edge-tts), and FFmpeg cinema compositing (smooth zoom/pan, crossfades, audio mastering, and zero bottom caption clutter).
---

# App Demo Video Producer Skill

Use this skill when producing a polished 2-minute product demo video for RepoMedic or any web application.

## Core Production Pipeline

1. **6-Chapter Narrative & Shooting Script (`technical-video-script` standard):**
   - **Chapter 1 (0:00–0:20) — Problem Statement:** Why production incidents take 45 minutes to triage and why unverified AI patches cannot be trusted in production.
   - **Chapter 2 (0:20–0:38) — The Idea:** RepoMedic (`Diagnose. Patch. Prove.`) — deterministic before/after sandbox verification + cryptographic SHA-256 human approval gate.
   - **Chapter 3 (0:38–0:58) — Technologies Used:** Nebius Token Factory (`nvidia/nemotron-3-super-120b-a12b`), Nebius Token Factory Sandboxes (`contree-sdk` Copy-on-Write layers), Vercel Sandbox microVMs, LangSmith (`smith.langchain.com`) 6-span trace trees & online evaluators, Tavily MCP, Supabase Postgres + RLS, and Resend.
   - **Chapter 4 (0:58–1:24) — Live App Walkthrough (Part 1):** 1-Click Judge Login (`/auth`), Incident Command Center (`/app`), and Proof-of-Fix Before/After Sandbox Verification (`Exit Code 1` → `Exit Code 0` + 1-line surgical diff).
   - **Chapter 5 (1:24–1:44) — Live App Walkthrough (Part 2):** Nebius ConTree Sandbox 3-step CoW execution + ANSI UTF-8 QR attestation, LangSmith 6-span trace waterfall & 4 online evaluators, 6-check static security scanner (`100/100`), and Episodic Memory + Tavily Co-Pilot.
   - **Chapter 6 (1:44–2:00) — Solution Impact & Governance:** SHA-256 gated GitHub Draft PR, Admin Control Plane (`/admin`), and 99.3% MTTR reduction (`45m → 18s`).

2. **Visual & Editing Rules:**
   - **Resolution & Frame Rate:** `1920x1080` Full HD, `30fps` / `60fps`, `libx264` (`yuv420p`, `crf 18`), `aac` `192k` audio.
   - **Zero Bottom Text Captions:** Never burn subtitle/caption text at the bottom of the frame; keep the viewport 100% clean so UI details remain unobstructed.
   - **Audio-Locked Pacing:** Synthesize each chapter's neural voiceover first, inspect exact audio duration via `ffprobe`, and match each visual sequence duration + smooth crossfade transition to the voiceover track.
