# RepoMedic — Diagnose. Patch. Prove.

**Autonomous Production Incident Investigator** built for the **Nebius × NVIDIA Global AI Hackathon** (*Coding and Agentic Engineering* track).

> **Pitch:** RepoMedic turns production exceptions into test-backed, security-audited draft pull requests—with every NVIDIA Nemotron decision, isolated Vercel Sandbox test run, and cryptographic SHA-256 verification step visible.

- **Live Production Deployment (Vercel):** [https://repomedic-eta.vercel.app](https://repomedic-eta.vercel.app)
- **1-Click Hackathon Demo Login (Admin & Developer/Judge):** [https://repomedic-eta.vercel.app/auth](https://repomedic-eta.vercel.app/auth)
- **Live Interactive Case Study (`/demo`):** [https://repomedic-eta.vercel.app/demo](https://repomedic-eta.vercel.app/demo)
- **Live Admin Control Plane (`/admin`):** [https://repomedic-eta.vercel.app/admin](https://repomedic-eta.vercel.app/admin)
- **Live Health & Readiness Endpoints:**
  - [`/api/health`](https://repomedic-eta.vercel.app/api/health)
  - [`/api/ai/health`](https://repomedic-eta.vercel.app/api/ai/health)
- **Public Application Repository:** [https://github.com/ensuredesign/repomedic](https://github.com/ensuredesign/repomedic)
- **Public Fixture Repository (`ensuredesign/repomedic-fixture`):** [https://github.com/ensuredesign/repomedic-fixture](https://github.com/ensuredesign/repomedic-fixture) (pinned baseline commit [`440255c3e1efe73a24d2cd92b90055c54c3e3549`](https://github.com/ensuredesign/repomedic-fixture/commit/440255c3e1efe73a24d2cd92b90055c54c3e3549))
- **Sample Approval-Gated Draft Pull Request:** [https://github.com/ensuredesign/repomedic-fixture/pull/4](https://github.com/ensuredesign/repomedic-fixture/pull/4)

---

## 1. Instant 1-Click Hackathon Jury Access (`/auth`)

On [https://repomedic-eta.vercel.app/auth](https://repomedic-eta.vercel.app/auth), judges can test both **Developer** and **Platform Admin** workflows in **one click** (or register a brand-new account):

| Persona | 1-Click Button on `/auth` | Demo Account | Capabilities |
| :--- | :--- | :--- | :--- |
| **Developer / Judge** | **1-Click User / Judge Login** | `judge@repomedic.dev` | Inspect 3 live verified Nemotron + Vercel Sandbox runs, launch new investigations (`/app/incidents/new`), manage profile (`/app/profile`), export SLSA Attestation JSON, send Resend email reports, and approve GitHub Draft PRs |
| **Platform Admin** | **1-Click Admin Panel Login** | `admin@repomedic.dev` | Access the **Admin Control Plane (`/admin`)**, inspect global KPIs & Nebius token consumption, manage User Directory & RBAC roles (`developer` ↔ `admin`), and audit all runs across users |
| **Guest Inspector** | **Open Case Study (`/demo`)** | No login required | Inspect the curated read-only Proof of Fix (`is_demo = true`), Automated Patch Security Audit, and SLSA Attestation JSON |

---

## 2. Core Engineering & Differentiator Capabilities

1. **Direct NVIDIA Nemotron Inference on Nebius Token Factory:**
   - Connects directly to `https://api.tokenfactory.us-central1.nebius.com/v1/` (`nvidia/nemotron-3-super-120b-a12b`) with strict Zod-validated structured outputs (`DiagnosisSchema`, `PatchProposalSchema`, `HealthSmokeSchema`).
2. **Isolated Before/After Verification (`@vercel/sandbox`):**
   - Executes baseline tests on the unmodified pinned SHA and post-patch tests in ephemeral Node 22 microVMs (`pnpm install --ignore-scripts` + `npx vitest run`). A patch is marked **Verified** only when baseline fails (`exitCode !== 0`) and post-patch passes (`exitCode === 0`) on the identical command.
3. **Automated Patch Security & Blast-Radius Scanner (`src/lib/security/patch-scanner.ts`):**
   - Every candidate patch is audited across 6 static security guardrails (`NO_DYNAMIC_CODE_EXEC`, `NO_SHELL_INJECTION`, `NO_SECRET_LITERALS`, `NO_TEST_TAMPERING`, `NO_DEPENDENCY_DRIFT`, `CRYPTOGRAPHIC_DIFF_INTEGRITY`) and assigned a **0–100 Surgical Precision Score**.
4. **Cryptographic SLSA-Style Attestation JSON (`/api/runs/[id]/attestation`):**
   - Exports a machine-verifiable JSON attestation bundle containing the pinned base SHA, Nemotron telemetry, sandbox exit codes, security audit results, human approval record, and overall `attestationSha256` digest.
5. **Supabase Postgres + Strict Row-Level Security (RLS) & RBAC:**
   - 8 normalized tables (`profiles`, `incidents`, `runs`, `run_events`, `patches`, `test_results`, `approvals`, `pull_requests`) with `FORCE ROW LEVEL SECURITY`, atomic stage leases (`claim_run_stage`), user profile management (`/app/profile`), and PostgreSQL trigger protection against privilege self-escalation (`guard_profile_role_update`).
6. **SHA-256 Approval-Gated GitHub Draft PRs + Opt-In Resend Email Reports:**
   - Zero autonomous GitHub writes. Only after a human approves the exact 64-char SHA-256 diff hash does RepoMedic create branch `repomedic/fix-<run-short-id>` and open an idempotent **Draft** PR, with optional Proof-of-Fix email delivery via **Resend** (`RepoMedic <info@ensure.in>`).

---

## 3. Live End-to-End Verification Evidence (3 Consecutive Runs)

Executed via `pnpm test:closed-loop` (`tests/m2-m4-live-closed-loop.test.ts`) against `ensuredesign/repomedic-fixture@440255c3e1efe73a24d2cd92b90055c54c3e3549`:

| Run # | Run ID | Model ID | Baseline Sandbox (`pnpm test`) | Patched Sandbox (`pnpm test`) | Security Audit | Verified Diff SHA-256 | Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#1** | `016537a7-4a37-4b36-ab34-7ef6ea3898a3` | `nvidia/nemotron-3-super-120b-a12b` | `exit 1` (7 passed, 1 failed) | `exit 0` (8 passed, 0 failed) | `6/6 Passed (100/100)` | `d2986c85dfb2...` | **Verified + [Draft PR #4](https://github.com/ensuredesign/repomedic-fixture/pull/4)** |
| **#2** | `5ca9e752-3292-488f-a672-d41057a8fdd3` | `nvidia/nemotron-3-super-120b-a12b` | `exit 1` (7 passed, 1 failed) | `exit 0` (8 passed, 0 failed) | `6/6 Passed (100/100)` | `d2986c85dfb2...` | **Verified** |
| **#3** | `f088542e-5132-42c3-8636-68eb02192ff7` | `nvidia/nemotron-3-super-120b-a12b` | `exit 1` (7 passed, 1 failed) | `exit 0` (8 passed, 0 failed) | `6/6 Passed (100/100)` | `d2986c85dfb2...` | **Verified** |

---

## 4. Technical Documentation Index

- [**Technical Architecture & State Machine (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md)
- [**Senior Cybersecurity & Quality Audit Report (`docs/SECURITY_AND_QUALITY_REPORT.md`)**](./docs/SECURITY_AND_QUALITY_REPORT.md)
- [**<3-Minute Demo Video Script & Judge Guide (`docs/DEMO_SCRIPT.md`)**](./docs/DEMO_SCRIPT.md)
- [**Product Requirements Document (`PRD.md`)**](./PRD.md)
- [**Environment & Credentials Setup Guide (`SETUP.md`)**](./SETUP.md)

---

## 5. Quickstart & Quality Gate Commands

```bash
pnpm install
cp .env.example .env.local
```

```bash
pnpm lint               # ESLint strict check
pnpm typecheck          # TypeScript --noEmit check
pnpm test               # Unit tests (9) + live Supabase RLS/RBAC (3) + live Nebius/Sandbox smoke (2)
pnpm test:closed-loop   # 3 consecutive live end-to-end closed-loop runs + Draft PR test
pnpm test:e2e           # Playwright desktop (1440x900) & mobile (390x844) verification (8 tests)
pnpm fixture:test       # Reproduces the deliberate baseline regression in fixtures/buggy-order-service
pnpm build              # Production Next.js build
```

---

## 6. License

Released under the [MIT License](./LICENSE). Maintained by `ensuredesign` (`ensure01@gmail.com`).
