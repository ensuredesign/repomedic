# RepoMedic — Diagnose. Patch. Prove.

**Autonomous Production Incident Investigator** built for the **Nebius × NVIDIA Global AI Hackathon** (*Coding and Agentic Engineering* track).

> **Pitch:** RepoMedic turns production errors into test-backed draft pull requests, with every AI decision and isolated verification step visible.

- **Live Production Deployment (Vercel):** [https://repomedic-eta.vercel.app](https://repomedic-eta.vercel.app)
- **Live Interactive Case Study (`/demo`):** [https://repomedic-eta.vercel.app/demo](https://repomedic-eta.vercel.app/demo)
- **Live Health & Readiness Endpoints:**
  - [`/api/health`](https://repomedic-eta.vercel.app/api/health)
  - [`/api/ai/health`](https://repomedic-eta.vercel.app/api/ai/health)
- **Public Application Repository:** [https://github.com/ensuredesign/repomedic](https://github.com/ensuredesign/repomedic)
- **Public Fixture Repository (`ensuredesign/repomedic-fixture`):** [https://github.com/ensuredesign/repomedic-fixture](https://github.com/ensuredesign/repomedic-fixture) (pinned baseline commit [`440255c3e1efe73a24d2cd92b90055c54c3e3549`](https://github.com/ensuredesign/repomedic-fixture/commit/440255c3e1efe73a24d2cd92b90055c54c3e3549))
- **Sample Approval-Gated Draft Pull Request:** [https://github.com/ensuredesign/repomedic-fixture/pull/4](https://github.com/ensuredesign/repomedic-fixture/pull/4)

---

## 1. Overview & Key Capabilities

- **Direct NVIDIA Nemotron Inference on Nebius Token Factory:** Uses `https://api.tokenfactory.us-central1.nebius.com/v1/` (`nvidia/nemotron-3-super-120b-a12b`) with strict Zod-validated structured outputs (`DiagnosisSchema`, `PatchProposalSchema`, `HealthSmokeSchema`). Never masquerades OpenRouter or mock responses as NVIDIA Nemotron.
- **Isolated Before/After Verification (`@vercel/sandbox`):** Runs baseline tests on the unmodified pinned SHA and post-patch tests in ephemeral microVMs (`node22`). A patch is marked **Verified** only if the baseline reproduces the failure (`exitCode !== 0`) and the candidate passes (`exitCode === 0`) on the identical test command (`pnpm test`).
- **Bounded Autonomous Repair Loop:** At most 2 patch attempts (1 autonomous reflection retry fed with actual sandbox test output).
- **Supabase Postgres + Strict Row-Level Security (RLS):** 8 normalized tables (`profiles`, `incidents`, `runs`, `run_events`, `patches`, `test_results`, `approvals`, `pull_requests`) with `FORCE ROW LEVEL SECURITY`, indexed foreign keys, and atomic stage locks (`claim_run_stage`).
- **SHA-256 Approval-Gated GitHub Draft PRs:** The AI model has zero direct write access to GitHub. Only after a human reviews the Proof of Fix and approves the exact 64-character SHA-256 diff hash does the backend create branch `repomedic/fix-<run-short-id>` and open an idempotent **draft** pull request on the allowlisted repository.
- **Judge-Friendly Recorded Case Study (`/demo`) & Instant Judge Workspace (`/auth`):** Guests can inspect a complete, clearly labeled recorded case study (`is_demo = true`) without signing in, or use the one-click **Instant Hackathon Judge Workspace** on `/auth` to inspect live verified runs or launch a new investigation.

---

## 2. Live End-to-End Verification Evidence (3 Consecutive Runs)

Executed via `pnpm test:closed-loop` (`tests/m2-m4-live-closed-loop.test.ts`) against `ensuredesign/repomedic-fixture@440255c3e1efe73a24d2cd92b90055c54c3e3549`:

| Run # | Run ID | Model ID | Baseline Sandbox (`pnpm test`) | Patched Sandbox (`pnpm test`) | Attempts | Verified Diff SHA-256 | Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#1** | `016537a7-4a37-4b36-ab34-7ef6ea3898a3` | `nvidia/nemotron-3-super-120b-a12b` | `exit 1` (7 passed, 1 failed) | `exit 0` (8 passed, 0 failed) | `1` | `d2986c85dfb2...` | **Verified + [Draft PR #4](https://github.com/ensuredesign/repomedic-fixture/pull/4)** |
| **#2** | `5ca9e752-3292-488f-a672-d41057a8fdd3` | `nvidia/nemotron-3-super-120b-a12b` | `exit 1` (7 passed, 1 failed) | `exit 0` (8 passed, 0 failed) | `1` | `d2986c85dfb2...` | **Verified** |
| **#3** | `f088542e-5132-42c3-8636-68eb02192ff7` | `nvidia/nemotron-3-super-120b-a12b` | `exit 1` (7 passed, 1 failed) | `exit 0` (8 passed, 0 failed) | `1` | `d2986c85dfb2...` | **Verified** |

---

## 3. Quickstart & Setup

### Prerequisites
- Node.js `>= 22` and `pnpm`
- A Supabase Postgres project (migrations in `supabase/migrations/`)
- Nebius Token Factory API key (`NEBIUS_API_KEY`) with access to `nvidia/nemotron-3-super-120b-a12b`
- Fine-grained GitHub token (`GITHUB_TOKEN`) scoped to your owned fixture repository (`GITHUB_ALLOWED_REPOS`)
- Vercel Sandbox credentials (`VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`)

### Installation

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` (never commit `.env.local`):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://repomedic-sb.propixer.in
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY

NEBIUS_API_KEY=YOUR_NEBIUS_TOKEN_FACTORY_KEY
NEBIUS_BASE_URL=https://api.tokenfactory.us-central1.nebius.com/v1/
NEBIUS_MODEL=nvidia/nemotron-3-super-120b-a12b

GITHUB_TOKEN=YOUR_FINE_GRAINED_PAT
GITHUB_ALLOWED_REPOS=ensuredesign/repomedic-fixture
GITHUB_FIXTURE_BASE_SHA=440255c3e1efe73a24d2cd92b90055c54c3e3549

VERCEL_TOKEN=YOUR_VERCEL_TOKEN
VERCEL_TEAM_ID=YOUR_VERCEL_TEAM_ID
VERCEL_PROJECT_ID=YOUR_VERCEL_PROJECT_ID
```

### Verification & Build Commands

```bash
pnpm lint               # ESLint strict check
pnpm typecheck          # TypeScript --noEmit check
pnpm test               # Unit tests + live Supabase RLS + live Nebius/Sandbox smoke tests
pnpm test:closed-loop   # 3 consecutive live end-to-end closed-loop runs + Draft PR test
pnpm test:e2e           # Playwright desktop (1440x900) & mobile (390x844) verification
pnpm fixture:test       # Reproduces the deliberate baseline regression in fixtures/buggy-order-service
pnpm build              # Production Next.js build
```

---

## 4. Repository Structure

```text
├── .agents/skills/                 # 5 project-local Antigravity engineering skills
│   ├── agent-reliability/
│   ├── github-pr-safety/
│   ├── premium-ui/
│   ├── supabase-postgres/
│   └── vercel-quality/
├── docs/
│   ├── ARCHITECTURE.md             # System architecture, threat model, and state machine
│   └── DEMO_SCRIPT.md              # <3-minute judge walkthrough & video script
├── fixtures/buggy-order-service/   # Deterministic 8-test Vitest fixture with 0% tax bug
├── supabase/migrations/            # Versioned PostgreSQL schema & RLS migrations
├── src/
│   ├── app/                        # Next.js App Router pages & API route handlers
│   ├── components/                 # Navigation & Proof of Fix UI components
│   └── lib/
│       ├── agent/                  # Bounded state machine & deterministic patch applier
│       ├── ai/                     # Direct Nebius Token Factory adapter & Zod schemas
│       ├── github/                 # Pinned SHA ingest & approval-gated draft PR creator
│       ├── sandbox/                # Isolated @vercel/sandbox test runner
│       ├── security/               # Secret redaction, path guards, rate limiter
│       └── supabase/               # Typed browser & SSR Supabase clients with retry
└── tests/                          # Unit tests, live Supabase RLS tests, 3-run closed loop, Playwright E2E
```

---

## 5. License

Released under the [MIT License](./LICENSE).
