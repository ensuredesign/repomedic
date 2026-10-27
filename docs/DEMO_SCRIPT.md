# RepoMedic — <3-Minute Demo Video Script & Judge Guide

**Target Length:** 2:35 – 2:50  
**Track:** Coding and Agentic Engineering (Nebius × NVIDIA Global AI Hackathon)

---

## Segment Breakdown

### 0:00 – 0:15 | The Hook: A Failing Repo, An Incident, A Verified Draft Fix
- Show the RepoMedic landing page (`/`).
- Highlight the core problem: LLM wrappers suggest unverified code; on-call engineers need deterministic proof that a minimal patch actually fixes the failing test without breaking the suite.
- Point out the stack strip: **NVIDIA Nemotron on Nebius Token Factory**, **Vercel Sandbox**, **Supabase Postgres + RLS**, and **Approval-Gated GitHub Draft PRs**.

### 0:15 – 0:40 | Instant Judge Access (`/demo`) & New Live Incident (`/app/incidents/new`)
- Open `/demo` to show the read-only recorded case study (`is_demo = true`) available to judges without signing in.
- Click **Run Live Investigation** → navigate to `/app/incidents/new`.
- Click **Prefill Reproducible Fixture Bug** (`malinikochar/repomedic-fixture`), showing the failing B2B 0% tax-exempt regression in `src/pricing.ts`.

### 0:40 – 1:30 | Live Closed-Loop Execution (Pin → Baseline Red → Nemotron Diagnosis → Patch)
- Click **Launch Live Investigation**.
- Watch the persisted stage timeline advance step by step:
  1. `fetching`: Fetches pinned commit SHA from the allowlisted fixture repository.
  2. `baseline_running`: Runs `npx vitest run` in an isolated Vercel Sandbox and records **Exit Code 1** (`1 failed | 7 passed`).
  3. `investigating`: Calls **NVIDIA Nemotron** directly via Nebius Token Factory (`https://api.tokenfactory.us-central1.nebius.com/v1/`), identifying line 45 in `src/pricing.ts` (`taxRatePercent || defaultRatePercent`).
  4. `patch_generating`: Generates a surgical 1-line edit replacing `||` with `??`.

### 1:30 – 2:05 | Proof of Fix: Baseline Red vs. Patched Green
- `patch_testing` completes with **Exit Code 0** (`8 passed | 0 failed`) in an isolated sandbox.
- Inspect the **Proof of Fix** hero panel:
  - Side-by-side Baseline (Exit 1) vs. Post-Patch (Exit 0) cards with durations and logs.
  - Line-numbered unified diff and `sha256` fingerprint.
  - Model identity and token telemetry.

### 2:05 – 2:35 | SHA-256 Human Approval Gate & Draft Pull Request
- Click **Review & Approve Draft PR** (`/app/incidents/[id]/review`).
- Check the human confirmation box verifying the exact 64-character SHA-256 diff hash.
- Click **Approve Diff Hash & Create Draft PR** (or download the `.patch` artifact).
- Show the resulting GitHub **Draft** Pull Request URL and idempotency guarantee.

### 2:35 – 2:50 | Closing Summary
- Recap: Real Nebius Token Factory NVIDIA Nemotron inference, isolated Vercel Sandbox before/after proof, strict Supabase RLS, and human-gated draft PRs.
