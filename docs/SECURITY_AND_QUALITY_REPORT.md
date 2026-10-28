# RepoMedic — Senior Cybersecurity & Quality Engineering Audit Report

**Audit Date:** October 29, 2026  
**Target System:** RepoMedic (`https://repomedic-eta.vercel.app`)  
**Repository:** `https://github.com/ensuredesign/repomedic`  
**Fixture Repository:** `https://github.com/ensuredesign/repomedic-fixture`  
**Auditor Role:** Senior Cybersecurity Architect & Principal Quality Engineer (`ensuredesign <ensure01@gmail.com>`)

---

## 1. Executive Summary

RepoMedic was subjected to a comprehensive white-box security, database governance, business-logic resilience, and end-to-end quality audit across all layers (Next.js 15 App Router, Supabase PostgreSQL 15 with `FORCE ROW LEVEL SECURITY`, Nebius Token Factory NVIDIA Nemotron inference, `@vercel/sandbox` microVM isolation, Octokit GitHub REST API, and Resend Email API).

| Audit Domain | Status | Key Verification Evidence |
| :--- | :--- | :--- |
| **1. Secret Isolation & Redaction** | **PASS (100%)** | Zero secrets in client bundles; regex redaction strips GitHub PATs, Nebius `v1.*` keys, Resend `re_*` keys, JWTs, and Bearer headers prior to DB storage or LLM prompts (`tests/unit-core.test.ts`). |
| **2. Database RLS & RBAC Privilege Guard** | **PASS (100%)** | All 8 tables enforce `FORCE ROW LEVEL SECURITY`. Cross-tenant read/write attempts return `0 rows`. Non-admin role self-escalation (`role = 'admin'`) is blocked by PostgreSQL trigger `guard_profile_role_update` (`tests/m1-supabase-rls.test.ts`). |
| **3. Arbitrary Code Execution Isolation** | **PASS (100%)** | Untrusted repository tests never execute inside Next.js serverless routes; all baseline and candidate tests run inside ephemeral `@vercel/sandbox` microVMs with `pnpm install --ignore-scripts` and zero application secrets passed. |
| **4. AI Output & Patch Safety** | **PASS (100%)** | Nemotron outputs are parsed through strict Zod schemas (`DiagnosisSchema`, `PatchProposalSchema`) and audited by a 6-check Static Patch Security & Blast-Radius Scanner (`src/lib/security/patch-scanner.ts`). |
| **5. Human-Gated GitHub Write Safety** | **PASS (100%)** | AI has zero direct GitHub write capability. `POST /api/runs/[id]/approve-pr` requires `confirmedHumanReview: true` and an exact 64-character SHA-256 diff hash match before opening an idempotent **Draft** PR ([PR #4](https://github.com/ensuredesign/repomedic-fixture/pull/4)). |
| **6. HTTP Security Headers & Rate Limiting** | **PASS (100%)** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security`, and per-user rate buckets enforced across all mutating endpoints. |
| **7. Responsive UI/UX & Accessibility** | **PASS (100%)** | Genesis (`chef/genesis`) design system with WCAG AA `>= 4.5:1` contrast, `>= 44×44px` mobile touch targets, and zero horizontal overflow verified across Desktop (`1440×900`) and Mobile (`390×844`) via Playwright (`8/8 passed`). |

---

## 2. OWASP Top 10:2025 Threat Matrix & Controls

### A01:2025 — Broken Access Control & IDOR
- **Threat:** User A attempts to read/modify User B's incidents, runs, patches, or escalate their own account to `admin`.
- **Control:**
  - PostgreSQL `FORCE ROW LEVEL SECURITY` on `profiles`, `incidents`, `runs`, `run_events`, `patches`, `test_results`, `approvals`, and `pull_requests` using `(select auth.uid()) = user_id`.
  - PostgreSQL `BEFORE UPDATE` trigger `trg_guard_profile_role_update` raises an exception if a non-admin attempts to modify `profiles.role`.
  - Live integration test `tests/m1-supabase-rls.test.ts` proves User B receives `[]` when querying User A's incident/run UUIDs and receives a Postgres error when attempting role self-escalation.

### A02:2025 — Cryptographic & Credential Failures
- **Threat:** Exposure of `NEBIUS_API_KEY`, `GITHUB_TOKEN`, `VERCEL_TOKEN`, or `RESEND_API_KEY` in browser bundles, stack traces, or database logs.
- **Control:**
  - Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` use the `NEXT_PUBLIC_` prefix.
  - `redactSecrets()` in `src/lib/security/redact.ts` scrubs GitHub tokens (`ghp_*`, `github_pat_*`), Nebius keys (`v1.*`), Resend keys (`re_*`), OpenAI-style keys (`sk-*`), JWTs (`eyJ*`), and `Authorization: Bearer` headers before storing incident traces or sandbox stdout/stderr.

### A03:2025 — Injection & Untrusted LLM Output
- **Threat:** Prompt injection in stack traces or repository comments tricks the LLM into modifying `.github/workflows`, `package.json`, test files, or injecting `eval()` / `child_process`.
- **Control:**
  - Path guardrails (`isSafeRepositoryFilePath`, `isPatchableSourcePath`) reject `..`, leading `/`, `\`, `.github/workflows/*`, `.env*`, `package.json`, lockfiles, and non-source extensions.
  - `analyzePatchSecurityAndBlastRadius()` (`src/lib/security/patch-scanner.ts`) inspects every added diff line for dynamic code execution (`eval`, `new Function`), shell execution (`child_process`, `execSync`), secret literals, and test tampering (`tests/**`, `.skip`, `.only`).

### A05:2025 — Security Misconfiguration
- **Threat:** Missing security headers or unguarded public endpoints.
- **Control:**
  - `next.config.ts` serves `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Strict-Transport-Security`.

### A10:2025 — Mishandling of Exceptional Conditions & Resource Exhaustion
- **Threat:** Stale runs locking a user account indefinitely (`409 CONCURRENT_RUN_LIMIT`), concurrent duplicate stage clicks, or transient upstream network blips.
- **Control:**
  - Atomic PostgreSQL stage lease lock (`claim_run_stage(p_run_id, p_claim_token, 120)`) prevents duplicate concurrent execution.
  - Automatic stale-run expiration (`> 5 minutes` or `cancelStaleRuns: true` in `POST /api/runs`) prevents abandoned runs from deadlocking future investigations.
  - `supabaseFetchWithRetry` automatically retries transient network/502/503/504 responses with exponential backoff.

---

## 3. Quality Gate & Live Test Execution Results

1. **Static Analysis & Type Safety:**
   - `pnpm lint`: `0 errors, 0 warnings` (Exit Code `0`)
   - `pnpm typecheck`: `0 errors` (Exit Code `0`)
2. **Unit, Database RLS/RBAC, & Live Nebius/Sandbox Integration Suite (`pnpm test`):**
   - `tests/unit-core.test.ts`: **9/9 passed** (secret redaction, path guards, Nemotron `<think>` JSON extraction, literal control-char repair, deterministic SHA-256 diff hashing, test outcome evaluator, Resend config, and 6-check Patch Security Scanner).
   - `tests/m1-supabase-rls.test.ts`: **3/3 passed** (anonymous `is_demo=true` read & write block, cross-user RLS isolation & atomic lease locks, and 1-Click Demo Admin/Developer RBAC & privilege escalation guard).
   - `tests/m1-live-nebius-and-sandbox.test.ts`: **2/2 passed** (live Nebius `/models` discovery + `nvidia/nemotron-3-super-120b-a12b` structured inference, and live GitHub pinned SHA fetch + isolated Vercel Sandbox baseline reproduction).
3. **3-Consecutive Live Closed-Loop Verification Runs (`pnpm test:closed-loop`):**
   - **3/3 consecutive runs** (`016537a7`, `5ca9e752`, `f088542e`) diagnosed `src/pricing.ts` line 45 with `nvidia/nemotron-3-super-120b-a12b`, generated the identical surgical diff (`d2986c85dfb2f8926d4bbf0dec800dc27c2aacc3c4c79de6c5b739148632536c`), verified `Exit Code 1 -> Exit Code 0` in isolated Vercel Sandboxes on Attempt #1, and opened idempotent GitHub Draft PR [`#4`](https://github.com/ensuredesign/repomedic-fixture/pull/4).
4. **Playwright E2E Desktop & Mobile Suite (`pnpm test:e2e`):**
   - **8/8 passed** across `desktop-chrome` (`1440×900`) and `mobile-chrome` (`390×844`) with zero horizontal overflow (`scrollWidth <= innerWidth`).
