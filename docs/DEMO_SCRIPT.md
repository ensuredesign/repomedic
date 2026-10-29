# RepoMedic — Official Smooth 1080p Demo Video Script & Judge Guide (`2:31`)

- **Official YouTube Demo Video (`1080p HD`):** [https://youtu.be/4Yephus8x1g](https://youtu.be/4Yephus8x1g)
- **Rendered 1080p Full HD MP4 (Remotion 4.0 · Smooth Pixel-Locked Motion · Studio Voiceover):** [`/demo-assets/repomedic-hackathon-demo-2min.mp4`](https://repomedic-eta.vercel.app/demo-assets/repomedic-hackathon-demo-2min.mp4) (`1920×1080`, `30fps`, `2m 31s`, `-16 LUFS` mastered audio, zero zoom jitter, zero bottom text captions)
- **Track:** Coding and Agentic Engineering (**Nebius × NVIDIA Global AI Hackathon**)
- **Maintainer:** `Ritesh Kochar / ensuredesign` (`ensure01@gmail.com`)

---

## Instant 1-Click Hackathon Demo Logins (`/auth`)

Judges can test every feature on [https://repomedic-eta.vercel.app/auth](https://repomedic-eta.vercel.app/auth) with **one click**:

| Role | 1-Click Button on `/auth` | Account Email | Destination | What Judges Can Inspect |
| :--- | :--- | :--- | :--- | :--- |
| **Developer / Judge** | `1-Click User / Judge Login` | `judge@repomedic.dev` | `/app` & `/app/profile` | 3 live verified Nemotron + Sandbox runs, Nebius ConTree CoW Verification, Public LangSmith Traces, [Draft PR #4](https://github.com/ensuredesign/repomedic-fixture/pull/4), New Incident launcher, Profile & Password Management |
| **Platform Admin** | `1-Click Admin Panel Login` | `admin@repomedic.dev` | `/admin` | Full Admin Control Plane, User Directory, live RBAC role promotion/demotion (`admin_set_user_role`), Global Runs Audit Log, Token & Cost Telemetry |
| **Guest (No Login)** | Open `/demo` | Anonymous (`is_demo=true`) | `/demo` | Curated read-only Case Study with Proof of Fix, 6-Gate Security Scanner, Nebius ConTree Sandbox, LangSmith Trace, SLSA-256 Attestation JSON, and Resend Email Report |

---

## 6-Chapter Remotion Film Beat Sheet (`0:00 – 2:31`)

### Chapter 1 (`0:00 – 0:21`) — The 3:00 AM Production Triage Bottleneck
- **Visual:** Ultra keynote visual (`scene1-problem.jpg`) + animated spring callout header (`CHAPTER 01 · THE PRODUCTION TRIAGE BOTTLENECK`).
- **Narration:** Highlights why traditional AI coding assistants fail during 3:00 AM production incidents—guessing at code without reproducing failures or verifying test suites.

### Chapter 2 (`0:21 – 0:46`) — Enter RepoMedic: Diagnose. Patch. Prove.
- **Visual:** Architecture vision (`scene2-idea.jpg`) + live Apple Cupertino landing page (`01-landing-hero.png`, `02-landing-workflow.png`).
- **Narration:** Introduces RepoMedic's closed-loop philosophy: pin the commit SHA, reproduce `exit 1`, diagnose root cause, synthesize a surgical patch, prove `exit 0` in clean-room sandboxes, and gate GitHub Draft PRs behind cryptographic SHA-256 human sign-off.

### Chapter 3 (`0:46 – 1:11`) — Full Partner Technology Stack
- **Visual:** Technical stack blueprint (`scene3-tech-stack.jpg`) + core pillars (`02b-landing-pillars.png`).
- **Narration:** Walks through **NVIDIA Nemotron 3 Super 120B** on **Nebius Token Factory**, **Nebius Token Factory Sandboxes (`contree-sdk`)**, **Vercel Sandbox**, **LangSmith (`smith.langchain.com`)**, **Tavily**, **Supabase Postgres + FORCE RLS**, and **Resend**.

### Chapter 4 (`1:11 – 1:41`) — 1-Click Jury Access, Incident Ingestion & 5-Stage Pipeline
- **Visual:** Stationary macOS Cupertino browser frames (`03-auth-portal.png` → `04-dashboard-command-center.png` → `05-new-incident-ingestion.png` → `06-proof-5stage-pipeline.png`).
- **Narration:** Demonstrates 1-click judge login, multi-tenant RLS dashboard, pinned repository ingestion (`ensuredesign/repomedic-fixture`), and real-time stage progression.

### Chapter 5 (`1:41 – 2:12`) — Proof of Fix, 6-Gate Security Audit, Nebius ConTree & LangSmith
- **Visual:** Proof of Fix diff & test transition (`07-proof-diff-and-sandbox.png` → `07b-security-scanner.png` → `08-proof-nebius-contree-sandbox.png` → `09-proof-langsmith-trace.png`).
- **Narration:** Showcases the surgical 1-line nullish-coalescing fix (`||` → `??`), `exit 1 → exit 0` proof, `100/100` 6-gate security score, **Nebius ConTree** Copy-on-Write QR attestation, and **LangSmith** 6-span trace with 4 online evaluators.

### Chapter 6 (`2:12 – 2:31`) — Nemotron Copilot, Admin Control Plane & Closing Impact
- **Visual:** Interactive Copilot + Tavily grounding (`10-proof-copilot-and-tavily.png` → `11-admin-control-plane.png` → `scene6-impact.jpg`).
- **Narration:** Demonstrates live Nemotron Copilot Q&A, Platform Admin RBAC Control Plane, and SHA-256 approval-gated GitHub Draft Pull Request creation—compressing MTTR from 45 minutes to 42 seconds.
