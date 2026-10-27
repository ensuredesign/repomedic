# RepoMedic — Diagnose. Patch. Prove.

**Autonomous Production Incident Investigator** built for the **Nebius × NVIDIA Global AI Hackathon** (*Coding and Agentic Engineering* track).

> **Pitch:** RepoMedic turns production errors into test-backed draft pull requests, with every AI decision and isolated verification step visible.

---

## 1. Overview & Key Capabilities

- **Direct NVIDIA Nemotron Inference on Nebius Token Factory:** Uses `https://api.tokenfactory.us-central1.nebius.com/v1/` with strict Zod-validated structured outputs (`DiagnosisSchema`, `PatchProposalSchema`, `HealthSmokeSchema`). Never masquerades OpenRouter or mock responses as NVIDIA Nemotron.
- **Isolated Before/After Verification (`@vercel/sandbox`):** Runs baseline tests on the unmodified pinned SHA and post-patch tests in ephemeral microVMs. A patch is marked **Verified** only if the baseline reproduces the failure (`exitCode !== 0`) and the candidate passes (`exitCode === 0`) on the identical test command.
- **Bounded Autonomous Repair Loop:** At most 2 patch attempts (1 autonomous reflection retry fed with actual sandbox test output).
- **Supabase Postgres + Strict Row-Level Security (RLS):** 8 normalized tables (`profiles`, `incidents`, `runs`, `run_events`, `patches`, `test_results`, `approvals`, `pull_requests`) with `FORCE ROW LEVEL SECURITY`, indexed foreign keys, and atomic stage locks (`claim_run_stage`).
- **SHA-256 Approval-Gated GitHub Draft PRs:** The AI model has zero direct write access to GitHub. Only after a human reviews the Proof of Fix and approves the exact 64-character SHA-256 diff hash does the backend create branch `repomedic/fix-<run-short-id>` and open a **draft** pull request on the allowlisted repository.
- **Judge-Friendly Recorded Case Study (`/demo`):** Guests can inspect a complete, clearly labeled recorded case study (`is_demo = true`) without signing in, or sign in to execute a live run.

---

## 2. Quickstart & Setup

### Prerequisites
- Node.js `>= 22` and `pnpm`
- A Supabase Postgres project (migrations in `supabase/migrations/`)
- Nebius Token Factory API key (`NEBIUS_API_KEY`) with access to an NVIDIA open-source Nemotron model (default candidate: `nvidia/nemotron-3-super-120b-a12b`)
- Fine-grained GitHub token (`GITHUB_TOKEN`) scoped to your owned fixture repository (`GITHUB_ALLOWED_REPOS`)
- Vercel Sandbox credentials (`@vercel/sandbox`)

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
GITHUB_ALLOWED_REPOS=YOUR_GITHUB_USERNAME/repomedic-fixture
GITHUB_FIXTURE_BASE_SHA=a4f91c2b8e0d413792b6c7a0e51d984f3c21b001
```

### Database Migrations

Apply the SQL migrations in `supabase/migrations/`:
1. `supabase/migrations/20261027000001_initial_schema.sql` — Tables, enums, foreign key indexes, RLS policies, and atomic stage lock RPCs.
2. `supabase/migrations/20261027000002_seed_demo_case_study.sql` — Curated read-only case study (`is_demo = true`) for `/demo`.

### Verification & Build Commands

```bash
pnpm typecheck      # Strict TypeScript check
pnpm lint           # ESLint check
pnpm test           # Vitest unit + live Supabase RLS verification suite
pnpm fixture:test   # Reproduces the deliberate baseline regression in fixtures/buggy-order-service
pnpm build          # Production Next.js build
```

---

## 3. Repository Structure

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
│       └── supabase/               # Typed browser & SSR Supabase clients
└── tests/                          # Live Supabase RLS tests, security tests, Playwright E2E
```

---

## 4. License

Released under the [MIT License](./LICENSE).
