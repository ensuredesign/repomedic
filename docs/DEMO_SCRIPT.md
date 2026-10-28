# RepoMedic — <3-Minute Demo Video Script & Judge Guide

**Target Length:** 2:35 – 2:50  
**Track:** Coding and Agentic Engineering (Nebius × NVIDIA Global AI Hackathon)  
**Maintainer:** `ensuredesign` (`ensure01@gmail.com`)

---

## Instant 1-Click Hackathon Demo Logins (`/auth`)

Judges can test every feature on [https://repomedic-eta.vercel.app/auth](https://repomedic-eta.vercel.app/auth) with **one click**:

| Role | 1-Click Button on `/auth` | Account Email | Destination | What Judges Can Inspect |
| :--- | :--- | :--- | :--- | :--- |
| **Developer / Judge** | `1-Click User / Judge Login` | `judge@repomedic.dev` | `/app` & `/app/profile` | 3 live verified Nemotron + Vercel Sandbox runs, [Draft PR #4](https://github.com/ensuredesign/repomedic-fixture/pull/4), New Incident launcher, Profile Management |
| **Platform Admin** | `1-Click Admin Panel Login` | `admin@repomedic.dev` | `/admin` | Full Admin Control Plane, User Directory, live RBAC role promotion/demotion (`admin_set_user_role`), Global Runs Audit Log, Token & Cost Telemetry |
| **Guest (No Login)** | Open `/demo` | Anonymous (`is_demo=true`) | `/demo` | Curated read-only Case Study with Proof of Fix, Patch Security Audit, Attestation JSON export, and Resend Email Report |

---

## Segment Breakdown

### 0:00 – 0:15 | The Hook: A Failing Repo, An Incident, A Verified Draft Fix
- Show the RepoMedic landing page (`/`), styled with the **Genesis (`chef/genesis`)** design system and WCAG AA contrast tokens.
- Highlight the core problem: LLM wrappers suggest unverified code; on-call engineers need deterministic proof that a minimal patch fixes the failing test in an isolated sandbox without breaking the suite or introducing security vulnerabilities.

### 0:15 – 0:45 | 1-Click Judge Login (`/auth`), Profile (`/app/profile`), & Admin Control Plane (`/admin`)
- Open `/auth` and click **1-Click Admin Panel Login** (`admin@repomedic.dev`) to showcase the **Admin Control Plane (`/admin`)**:
  - Live infrastructure health (Nebius Token Factory `nvidia/nemotron-3-super-120b-a12b`, Vercel Sandbox microVMs, Supabase Postgres + RLS, GitHub Allowlist `ensuredesign/repomedic-fixture`, Resend Email `RepoMedic <info@ensure.in>`).
  - User Directory & RBAC role toggle (`developer` ↔ `admin`).
  - Global Incident Runs & Token Telemetry table.
- Click **Profile (`/app/profile`)** to show user profile management and personal investigation statistics.

### 0:45 – 1:35 | Live Closed-Loop Execution (`/app/incidents/new`)
- Navigate to `/app/incidents/new` and select **Preset #1** (`ensuredesign/repomedic-fixture @ 440255c3e1efe73a24d2cd92b90055c54c3e3549`), showing the failing B2B 0% tax-exempt regression in `src/pricing.ts`.
- Click **Launch Live Investigation** and watch the persisted stage timeline advance:
  1. `fetching`: Fetches allowlisted files at the pinned commit SHA.
  2. `baseline_running`: Runs `npx vitest run` in an isolated Vercel Sandbox and records **Exit Code 1** (`1 failed | 7 passed`).
  3. `investigating`: Calls **NVIDIA Nemotron** (`nvidia/nemotron-3-super-120b-a12b`) on Nebius Token Factory, isolating line 45 in `src/pricing.ts` (`taxRatePercent || defaultRatePercent`).
  4. `patch_generating`: Generates a surgical 1-line edit replacing `||` with `??`.

### 1:35 – 2:15 | Proof of Fix, Automated Patch Security Audit, & Attestation JSON
- `patch_testing` completes with **Exit Code 0** (`8 passed | 0 failed`) in an isolated Vercel Sandbox microVM.
- Inspect the **Proof of Fix** hero panel:
  - Side-by-side Baseline (`Exit 1`) vs. Post-Patch (`Exit 0`) cards with durations and redacted logs.
  - **Automated Patch Security & Blast-Radius Audit (`6/6 Checks Passed · 100/100 Surgical Score`)**: verifies zero dynamic code execution, zero shell spawning, zero secret literals, preserved test suite integrity, allowlisted source scope, and SHA-256 diff match.
  - Click **Attestation JSON** to export the cryptographically hashed SLSA-style verification bundle, or click **Email Report** to send the Proof-of-Fix report via Resend (`RepoMedic <info@ensure.in>`).

### 2:15 – 2:50 | SHA-256 Human Approval Gate & Idempotent GitHub Draft PR
- Click **Review & Approve Draft PR** (`/app/incidents/[id]/review`).
- Check the human confirmation box verifying the exact 64-character SHA-256 diff hash (`d2986c85dfb2f8926d4bbf0dec800dc27c2aacc3c4c79de6c5b739148632536c`).
- Click **Approve Diff Hash & Create Draft PR** to open an idempotent GitHub **Draft** Pull Request ([Draft PR #4](https://github.com/ensuredesign/repomedic-fixture/pull/4)).
