# RepoMedic Technical Architecture & Security Model

## 1. High-Level System Architecture

```mermaid
flowchart TD
  Browser["Next.js 15 App Router UI (Graphite Developer Dashboard)"]
  Auth["Supabase Auth + SSR Session"]
  API["Next.js Route Handlers (/api/incidents, /api/runs, /api/ai/health)"]
  DB[("Supabase Postgres 15 + Force RLS\nincidents, runs, run_events, patches,\ntest_results, approvals, pull_requests")]
  Nebius["Nebius Token Factory API\nNVIDIA Nemotron (OpenAI-Compatible REST)"]
  Sandbox["Vercel Sandbox SDK (@vercel/sandbox)\nIsolated Ephemeral Node 22 MicroVM"]
  GitHub["GitHub REST API (Octokit)\nPinned SHA Read + Approval-Gated Draft PR"]

  Browser -->|Cookie Session| Auth
  Browser -->|Poll & Advance Bounded Stages| API
  API -->|RLS-Scoped Queries & Atomic Stage Lock| DB
  API -->|Server-Only NEBIUS_API_KEY + Zod Validation| Nebius
  API -->|Zero Secrets Passed · Isolated Baseline & Candidate Runs| Sandbox
  API -->|Read Pinned Tree / Write Draft PR After SHA-256 Approval| GitHub
```

## 2. Bounded Resumable State Machine

To avoid unreliable background promises in serverless functions, RepoMedic uses an atomic, DB-claimed step-by-step state machine (`public.claim_run_stage`):

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> fetching
  fetching --> baseline_running
  baseline_running --> unverified: Exit Code 0 (Failure Not Reproduced)
  baseline_running --> investigating: Exit Code != 0 (Failure Reproduced)
  investigating --> patch_generating: Structured Nemotron Diagnosis
  patch_generating --> patch_testing: Validated Diff (Attempt 1..2)
  patch_testing --> verified: Exit Code 0 on Identical Suite
  patch_testing --> refining: Exit Code != 0 & Attempt < 2
  refining --> patch_testing: Attempt 2 Candidate Patch
  patch_testing --> unverified: Exit Code != 0 & Attempt == 2
  verified --> draft_pr_created: Human Approves Exact Diff SHA-256
```

## 3. Defense-in-Depth Security Controls

1. **Untrusted Data Boundary:** Repository files, stack traces, test logs, and LLM responses are treated as untrusted input. Every Nebius response is parsed and validated against strict Zod schemas (`src/lib/ai/schemas.ts`).
2. **Path & Repository Allowlist (`src/lib/security/redact.ts`):**
   - Only repositories listed in `GITHUB_ALLOWED_REPOS` are accepted.
   - Path traversal (`..`), absolute paths, `.github/workflows/**`, `.env*`, lockfiles, `package.json`, and binaries are blocked from modification.
3. **Isolated Test Execution (`src/lib/sandbox/runner.ts`):**
   - Untrusted repository tests never run inside the Next.js host process.
   - `@vercel/sandbox` creates an isolated microVM, installs dependencies with `--ignore-scripts`, runs `npx vitest run`, and stops the sandbox inside a `finally` block.
4. **Human Approval Gate (`src/app/api/runs/[id]/approve-pr/route.ts`):**
   - Requires authenticated owner session, `verified` run status, and exact 64-character SHA-256 match (`approvedDiffSha256 === patch.diff_sha256`).
   - Enforces `unique (run_id)` on `public.pull_requests` and checks existing GitHub PRs on branch `repomedic/fix-<run-short-id>` for idempotency.
