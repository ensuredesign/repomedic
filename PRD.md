# RepoMedic — Product Requirements Document (PRD)

**Product:** RepoMedic — Autonomous Production Incident Investigator  
**Version:** 1.0 | **Prepared:** 27 October 2026 | **Target:** Nebius × NVIDIA Global AI Hackathon (Coding and Agentic Engineering)  
**Submission deadline:** 30 October 2026, 10:00 AM PDT (10:30 PM IST; verify on Devpost).  
**Owner:** Hackathon participant | **Status:** Approved build specification (implementation not yet started)  
**Deployment:** Vercel | **Code:** Public GitHub repository, open-source license | **Database/Auth:** Supabase  
**AI:** NVIDIA Nemotron via Nebius Token Factory | **Execution:** Vercel Sandbox

> **Design intent:** An engineering tool that demonstrates an auditable, closed-loop bug-fixing process, not a chatbot or a hard-coded demo. All claims of test success must be backed by actual command results.

## 1. Executive summary

RepoMedic converts an actual software failure into a reviewable, test-validated fix. A developer supplies a GitHub repository (MVP: an owned, allowlisted public fixture repository) plus a stack trace, failing test output, or error description. RepoMedic fetches a pinned repository revision, uses NVIDIA Nemotron hosted by Nebius Token Factory to investigate evidence, generates a minimal candidate patch, runs baseline and post-patch checks in a fresh Vercel Sandbox, and presents a **Proof of Fix** with real output, diffs, and limitations. With explicit user approval, it creates a branch and **draft** GitHub pull request. It does not auto-merge or deploy to production.

**Pitch (one sentence):** “RepoMedic turns production errors into test-backed draft pull requests, with every AI decision and verification step visible.”

**Differentiation:** Reproducible before/after tests, line-linked evidence, bounded autonomous repair iteration, approval-gated writes, and an audit trail of model/tool actions.

## 2. Competition alignment and non-negotiables

- Track: **Coding and Agentic Engineering**.
- Make a **real runtime call** to Nebius Token Factory with an **NVIDIA open-source Nemotron** model; do not satisfy this via screenshots, mocks, OpenRouter-only routing, or development-only calls.
- Show a real plan → inspect → patch → execute tests → iterate (up to 2 repair attempts) workflow.
- Demo must be working and available for evaluation; public repository, open-source LICENSE, README, public YouTube video **under 3 minutes**, project explanation, and Nebius/NVIDIA feedback.
- Judge emphasis (equally weighted): technological implementation, design, potential impact, quality of idea.
- License and attribution for source code, fixture dependencies, icons, screenshots, and demo assets.
- Keep evaluation deployment and demo access available through the judging period. Confirm eligibility and policy details on official rules.

Sources: https://nebiusglobalaihackathon.devpost.com/rules ; https://nebiusglobalaihackathon.devpost.com/updates/46204-here-s-how-judging-works

## 3. Problem / user / outcomes

### Problem
Incident response is slow and fragmented: engineers sift through traces, navigate repos, hypothesize causes, construct minimal fixes, run tests, and explain results. Existing LLM wrappers often suggest code without demonstrating it actually works.

### Primary user
Solo developers, startup engineers, on-call maintainers, and hackathon judges who want a defensible first draft of an incident fix. MVP supported scenario: JavaScript/TypeScript repo with a deterministic Vitest/Jest suite and a known reproducible bug.

### Jobs-to-be-done
1. “Given this exception, tell me which exact code path caused it.”
2. “Propose the smallest safe fix and show precisely what changed.”
3. “Prove that the failure is resolved and other tests still pass.”
4. “Let me review and approve a draft PR without surrendering repository control.”

### Success metrics
- **Demo reliability:** >= 3 consecutive end-to-end runs succeed on the owned fixture repo, with no manual intervention beyond the one explicit PR approval.
- **Verified result:** baseline red test becomes green after patch; same test suite and lockfile for before/after; actual exit codes, SHA, timestamps, and logs persisted.
- **Latency target:** <= 3 minutes for small test fixture when infrastructure permits; publish actual measured latency, not a guarantee.
- **Usability:** a first-time judge understands the result within 30 seconds of loading the demo.
- **Safety:** zero leaked API keys; zero unapproved GitHub writes; untrusted code never executed inside a Vercel app function.
- **Cost:** enforce per-run limits on model calls, tokens, sandbox runtime, and concurrent runs; expose estimated usage where available.

## 4. Scope priorities

### P0: Must ship
- Premium, responsive landing page with clear CTA and concise value proposition.
- Supabase Auth (GitHub OAuth optional; magic-link/email acceptable) and protected app; **guest read-only pre-recorded case study** for judges who don't sign in.
- New incident form: selectable **owned fixture repository**, error/trace input, optional affected file; validate length and repo allowlist. Never permit arbitrary repo cloning on the public demo by default.
- True Nebius Token Factory Nemotron inference: structured investigation plan, hypothesis, file selection, patch proposal, and reflection after test failure.
- GitHub read integration for commit-pinned file content / repository tree, with bounded file size and paths.
- Execution in **Vercel Sandbox**: baseline run on unmodified pinned SHA, patched run in a clean equivalent environment. Use a dependency lockfile, fixed commands, timeouts, resource caps; sanitize logs.
- Bounded agent orchestration: analyze → propose → test → reflect/repair once → report. Persist every stage and surface real-time progress (polling acceptable).
- Proof of Fix: baseline/post-patch pass counts or exit codes, test logs, file paths/line references, unified diff, commit SHA, model identity, elapsed time, transparent failures.
- Human approval before creating a **draft** PR in an **owned allowlisted repository**. No auto-merge, push to default branch, credential leakage, or production deployment.
- Supabase tables, RLS policies, migrations in Git, typed clients, error states, run history, and access controls.
- README, LICENSE (MIT or Apache-2.0), `.env.example`, architecture diagram, reproducible fixture, test instructions, and public deployment.

### P1: Only after P0 verified
- Distinguish likely root cause from weak evidence; show evidence confidence as calibrated qualitative labels (not fabricated probability).
- Compare a baseline run and a single autonomous repair iteration visually.
- Resend notification on approved PR creation (opt-in; don't email user content without consent).
- Export reproducible HTML/Markdown incident report.
- Optional Tavily source lookup only when external library behavior is truly needed; don't let web search dominate.

### P2: Out of scope for this hackathon
- Production monitoring ingestion; arbitrary private repositories; arbitrary self-hosted code runners; unlimited agent loops; auto-merge; deployment to production; multi-tenant teams; billing; multi-language build matrices; SOC2 claims; production incident remediation; Slack/Jira bi-directional automation.

## 5. User journeys

### J1 — Judge reviews a live run
1. Opens `/demo`, sees sample incident and fixture repo link.
2. Clicks **Investigate live** (limit anonymous runs; or signs in for execution).
3. Watches actual stages: ingest, inspect, hypothesize, patch, test, refine, outcome.
4. Opens **Proof of Fix** with two independent test runs, exact original SHA, patch diff, traceable tool log.
5. Can inspect source and see model provider and actual request metadata (never secret tokens).

### J2 — Developer investigates an error
1. Authenticates; enters a traceback and chooses owned fixture repository.
2. Confirms execution scope and authorized repo access.
3. Starts the run; tracks events without refreshing; can resume after a refresh.
4. Examines hypothesis, file evidence, patch, and test outcome.
5. Approves **Create draft PR** separately. App responds with real PR URL and audit entry.

### J3 — Failure / limitations
If inference times out, no permissions, patch malformed, sandbox quota exhausted, or test fails after the allowed retry, show a clear **Unverified** or **Failed** outcome, actual error details, run ID, retry guidance, and no success badge. Never mask failures or show mock “8/8 tests” data as real.

## 6. UX / design requirements

### Brand
- Product name: **RepoMedic**. Tagline: **Diagnose. Patch. Prove.**
- Look and feel: premium developer operations software; dark graphite background, near-white foreground, restrained electric cyan or teal highlights, subtle gradients only at hero/primary CTA, generous spacing, hairline borders, calm data-density.
- Design references: modern observability / developer tooling (original design, no pixel-copy of other brands).
- Typography: Geist Sans + Geist Mono or similarly professional licensed families.
- Accessibility: WCAG AA contrast where feasible; visible keyboard focus, semantic form labels, reduced-motion preference, tab-accessible diff/log panels, no color-only test-status meaning.
- Responsive: 1440px desktop primary, 768px tablet, 390px mobile (single-column usable).
- Animations: purposeful 150–250ms transitions; no fake terminal stream or ornamental progress unrelated to back end.

### Screens and required elements
1. `/` Marketing: credible outcome statement, architecture strip, annotated workflow, example proof, CTA **Open live demo**; clear technology badges.
2. `/demo` Demo case: read-only narrated incident with sample repo details and **live execution** path clearly distinguished from recorded case study.
3. `/app` Dashboard: recent runs, statuses, durations, verified vs unverified badges, new incident CTA.
4. `/app/incidents/new`: repository selector (allowlisted), error text, inputs, expected run limits, button.
5. `/app/incidents/[id]`: split view: workflow timeline / investigation summary / patch / proof of fix; sticky status; activity events; clear real vs sample markers.
6. `/app/incidents/[id]/review`: changed files, syntax-highlighted diff, baseline-vs-patched logs, risk notes, approval checkbox, Create draft PR.
7. Empty states / error states / loading skeletons / 404.

### Proof of Fix UI
Display at minimum: source repository, original SHA, incident input, baseline exact command + exit code, patched exact command + exit code, output summaries, tests discovered/passing/failing (only if parsable from actual runner), changed files, PR URL when available, run timestamps. Failing checks should remain visible even if a later retry succeeds.

## 7. Detailed functional requirements and acceptance criteria

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-01 | Input validation | Empty/oversized errors rejected; repo must be allowlisted; fixed-size file manifest; no path traversal. |
| FR-02 | Auth | Only owner sees private run details; guests access only explicit demo artifacts; RLS enforced server-side. |
| FR-03 | Model inference | Actual `NEBIUS_API_KEY` server-side, configurable Token Factory base URL/model; request IDs logged where exposed, no fallback masquerading as NVIDIA. |
| FR-04 | Structured planning | Model returns parsed/validated schema for hypotheses, evidence paths, next steps; rejects invalid payloads gracefully. |
| FR-05 | GitHub ingest | Fetch pinned SHA and allowlisted files; verify SHA/path; no secrets in UI logs. |
| FR-06 | Sandbox | Fresh isolation for baseline and patched execution; no production credentials, bounded network/resources/time; cleanup in `finally`. |
| FR-07 | Patch | Strict path allowlist, no binary changes or package/dependency scripts modification in MVP unless reviewed; diff displayed. |
| FR-08 | Repair loop | At most 2 patch attempts, <= configured calls/budget; explicit termination status. |
| FR-09 | Evidence | Persist real test results and artifacts; never manufacture metrics, success, or citations. |
| FR-10 | Approval | Explicit logged approval before GitHub branch/write; only owned fixture repo; draft PR only. |
| FR-11 | Resilience | Stage transitions idempotent; replays don't create duplicate branches/PRs; retry recoverable errors safely. |
| FR-12 | Run history | User lists prior runs with exact status, date, repo, and read-only details. |
| FR-13 | Privacy/security | Redact secrets from errors, logs, and model prompts; bounded retention; server-only keys. |
| FR-14 | Documentation | Setup works from clean clone using documented env/migrations; diagram and video link. |
| FR-15 | Accessibility | Keyboard navigable, contrast checked, loading/error communicated to screen readers. |

## 8. Technical architecture

```text
Browser (Next.js 15+/React/TypeScript/Tailwind/shadcn UI)
    | Supabase Auth session
    v
Vercel Next.js Route Handlers (authorization, orchestration and GitHub writes)
    |--- Supabase Postgres + RLS: incidents, runs, events, artifacts, approvals
    |--- Nebius Token Factory -> NVIDIA Nemotron 3 Super (configurable)
    |--- GitHub API -> pinned public repo files + draft PRs (approval only)
    `--- Vercel Sandbox SDK -> isolated clone/install/test/apply diff/test/cleanup

Antigravity 2.0 --(development only, OAuth, scoped)--> Supabase MCP
```

### Stack decisions
- Web: Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Lucide icons; TanStack Query or server actions as justified; Zod validation.
- Data: Supabase Postgres and Auth; RLS with project-owned `user_id`; migration files in `supabase/migrations`; development through project-scoped Supabase MCP.
- AI: direct Token Factory OpenAI-compatible API (official example base: `https://api.tokenfactory.us-central1.nebius.com/v1/`), default model `nvidia/nemotron-3-super-120b-a12b` **only if listed for the participant's account**, otherwise configure another NVIDIA open-source model actually available. Never guess model access; verify `/models` using key.
- Source control: GitHub REST or Octokit; installation-scoped GitHub App preferred; for a single owned demo repo, fine-grained PAT with minimum contents read/write and PR permissions, stored server-side only. Re-check actual permission needs.
- Runner: `@vercel/sandbox` SDK, short-lived sandbox, no pass-through of application credentials; avoid arbitrary shell interpolations; bounded dependency install and scripts; allowlist commands and fixture repo.
- Host: Vercel; environment variables configured for production/preview; run cost quotas; sandbox pricing and availability must be checked before relying on the feature.
- Email (optional): Resend on opt-in only, never core path.

### Crucial infrastructure decision — no unreliable background illusion
The MVP can use a **bounded, resumable step-by-step run controller**. POST `/api/runs` creates state; POST `/api/runs/:id/advance` processes one idempotent bounded stage and persists outcome; UI polls events and advances while tab is open. If the tab closes, it displays **Paused — Resume run**; do not pretend the workflow continued asynchronously. Put a DB lock/claim around each transition to prevent double execution. Later replace with a true durable queue/worker if time permits. Vercel request time limits apply to each step; heavy execution happens in Vercel Sandbox. Track per-stage durations, avoid long-running hidden timers. Ensure sandbox lifetime and run-state continuity across requests or choose a single bounded run with real timeout handling.

### Investigation state machine
`queued -> fetching -> baseline_running -> investigating -> patch_generating -> patch_testing -> (refining -> patch_testing, max once) -> verified | unverified | failed -> awaiting_approval -> draft_pr_created`

A failed baseline reproduction is **not** proof that the patch fixed the reported incident. Mark proof inconclusive and explain. On verified patch, do not change status to `draft_pr_created` until GitHub confirms the PR.

### Agent tools and schemas
- `list_repository_files(repo, sha, limit)`
- `read_file(repo, sha, relative_path)`
- `get_baseline_results(run_id)`
- `propose_patch(files, error_context) -> {rationale, unifiedDiff, touchedPaths, testsToRun, riskNotes}`
- `run_sandbox_tests(run_id, revision_or_patch, safe_command_id) -> {exitCode, stdoutRef, stderrRef, durationMs, tests?}`
- `evaluate_test_result(baseline, candidate) -> {isVerified, why, remainingFailures}`
- `create_draft_pr(run_id, approval_id)` [explicit approval and idempotency check; NEVER exposed to unapproved model call]

Use Zod schemas for every model response. Treat repo content, logs, comments, and model outputs as **untrusted data**, not instructions. Only the application policy determines allowed tool invocations.

## 9. Data model (Supabase)

### Tables
- `profiles`: `id uuid` (auth.users FK), `display_name`, `created_at`.
- `incidents`: `id uuid`, `user_id uuid`, `repository_full_name`, `repository_id`, `base_sha`, `error_text_redacted`, `title`, `created_at`.
- `runs`: `id uuid`, `incident_id uuid`, `user_id uuid`, `status enum`, `attempt_count`, `current_stage`, `model_id`, `input_tokens`, `output_tokens`, `estimated_cost_usd nullable`, `started_at`, `finished_at`, `last_error`, `runner_id nullable`.
- `run_events`: `id uuid`, `run_id uuid`, `user_id uuid`, `seq integer`, `stage`, `event_type`, `summary`, `payload jsonb` [filtered], `created_at`.
- `patches`: `id uuid`, `run_id uuid`, `attempt_number`, `unified_diff`, `touched_paths text[]`, `rationale`, `created_at`.
- `test_results`: `id uuid`, `run_id uuid`, `patch_id nullable`, `kind baseline|candidate`, `command`, `exit_code`, `passed nullable`, `failed nullable`, `duration_ms`, `stdout_excerpt`, `stderr_excerpt`, `log_object_path nullable`, `created_at`.
- `approvals`: `id uuid`, `run_id uuid`, `user_id uuid`, `approved_sha`, `approved_patch_id`, `approved_at`, `action = create_draft_pr`.
- `pull_requests`: `id uuid`, `run_id uuid unique`, `github_pr_number`, `github_pr_url`, `branch_name`, `created_at`.

All incident-linked tables have owner checks; never rely on frontend filtering. Add unique `(run_id, seq)`, foreign keys, indexes on `user_id`, `created_at`, status, and consistency constraints. `run_events`/logs shouldn't contain access tokens. SQL migration and RLS tests are implementation deliverables.

### RLS policy concept
- Users may SELECT their own incidents/runs/events/patches/results/approvals/PRs.
- Creation and state mutation happen through authenticated server routes using verified `auth.uid()` or carefully scoped server-side access, not writable-from-browser status fields.
- If using service-role key server-side, explicitly validate user ownership on every request; service role bypasses RLS. Public `/demo` data must be a separate sanitized fixture view, not unrestricted row access.

### Storage/retention
- Full logs optional private Supabase Storage bucket (signed URLs); UI shows redacted excerpts.
- Keep demo runs for judging; normal runs can be deleted after a configurable interval. Allow user deletion of own incidents.

## 10. Backend API contract

| Method/path | Purpose | Auth / authorization |
|---|---|---|
| `POST /api/incidents` | Validate fixture repo + error, create incident | Auth required; rate limit |
| `POST /api/runs` | Create run for incident, return ID | Auth owner; idempotency key |
| `POST /api/runs/:id/advance` | Execute next bounded stage | Auth owner, claim stage lock; rate limit |
| `GET /api/runs/:id` | Status, artifacts, summary | Auth owner or curated demo route |
| `GET /api/runs/:id/events?after=N` | Incremental event stream via polling | Auth owner |
| `POST /api/runs/:id/approve-pr` | Validate verified status + approved diff SHA | Auth owner + explicit approval |
| `GET /api/demo` | Redacted public sample case | No auth, strictly static/published artifacts |
| `GET /api/health` | Operational health without secrets | Public safe response |

All mutation endpoints use validation, rate limiting, idempotency and consistent error shapes (`{error:{code,message,requestId}}`). Never expose `NEBIUS_API_KEY`, `GITHUB_TOKEN`, Supabase service role, or Vercel credentials to browser.

## 11. GitHub patch and PR safety

- No arbitrary repository mutations. Restrict to a single explicitly configured owned repo in the MVP.
- Pin base SHA; refuse changes if head moved unexpectedly.
- Review allowed changed paths and file types; prohibit `.github/workflows/**`, `.env*`, secrets, lockfiles, deployment configs, and binary files by default.
- Generate patch via structured file edits or a validated unified diff. Apply patch only in sandbox first. Prevent traversal/symlink escapes.
- Model cannot invoke GitHub write tools directly; backend requires stored human approval of the exact diff hash.
- Create unique deterministic branch name `repomedic/fix-<run-short-id>` and draft PR; deduplicate on run ID and branch/PR lookup.
- **Never merge, deploy, or operate on production.** Display user responsibility to review AI changes.
- If automatic PR creation is not ready, show downloadable patch as an honest fallback, label PR action unavailable, and prioritize genuine test proof.

## 12. Security, governance, and reliability

### Threat model
Untrusted repository code, prompt injection in README/source/logs, malicious issue text, secrets in stack traces, SSRF via git URLs, arbitrary code execution, leaked credentials, runaway loops/costs, unauthorized cross-user access, and duplicate GitHub writes.

### Mandatory mitigations
- Server-only keys; `.env.local` ignored; never add secrets to screenshots/repo/LLM prompts.
- Repo allowlist; file count/size limits; secure pathname normalization; zero user-controlled shell command interpolation.
- Egress restrictions and no sensitive credentials inside Sandbox; verify Vercel Sandbox networking controls and document what cannot be enforced.
- Always destroy sandbox on completion/failure; stage wall-clock and token caps; 2 repair attempts max; 1 live concurrent run/user.
- Input/output sanitization and secret redaction before model invocation or persisted logs.
- Supabase RLS + authorization tests; CSRF protections where applicable, abuse throttling, secure cookies.
- No PII in public demo; consent before any external email or repo write.
- Query only selected source files, do not send entire repo blindly to model.
- Honest data provenance in UI: real run / illustrative preview / failed or unavailable result clearly separated.

## 13. Agent orchestration pseudocode

```typescript
const MAX_PATCH_ATTEMPTS = 2;
async function advanceRun(runId: string, actor: AuthenticatedUser) {
  const run = await claimNextStageAtomically(runId, actor.id); // lock/idempotency
  if (!run) return currentState(runId);
  try {
    switch (run.stage) {
      case 'fetching': return await fetchPinnedRepo(run);
      case 'baseline_running': return await runIsolatedBaseline(run);
      case 'investigating': return await callNemotronForStructuredDiagnosis(run);
      case 'patch_generating': return await callNemotronForValidatedPatch(run);
      case 'patch_testing': return await runPatchedTestsInSandbox(run);
      case 'refining':
        if (run.attemptCount >= MAX_PATCH_ATTEMPTS) return markUnverified(run);
        return await callNemotronWithActualTestFeedback(run);
      default: return currentState(runId);
    }
  } catch (err) {
    return await recordSanitizedFailureOrRetry(run, err);
  } finally {
    await releaseRunClaim(runId);
  }
}
```

If baseline fails to reproduce the exact issue, annotate that as *inconclusive*; don't claim a proven fix. Verification criteria must be deterministic and implemented in code, not a free-form self-assessment by the model.

## 14. Demo fixture / quality assurance

### Recommended fixture
Create a tiny independently understandable TypeScript utility service (`fixtures/buggy-order-service/` or separate owned repo) with 8 deterministic Vitest tests; introduce one deliberate `0`/null-handling bug causing a specific test to fail (or equivalent crisp regression). Pin initial failing commit SHA. Fix should be small (ideally <= 10 LOC), and tests must pass afterward. Do not hard-code the desired patch or fake outputs; the agent genuinely investigates.

### Verification checklist
- [ ] 3 consecutive runs on same pinned bug with real Nemotron calls and test logs.
- [ ] Baseline fails on original SHA; patched suite passes, with exact unchanged test command.
- [ ] Negative test: wrong repository rejected; unauthorized user denied; invalid diff refused.
- [ ] Negative test: model error, sandbox timeout, failed patch, and GitHub permission error show honest states.
- [ ] Disallow `.env`, workflows, arbitrary shell and traversal paths.
- [ ] Audit test: two PR approval retries produce one draft PR maximum.
- [ ] All UI links functional; no dummy data on live views; demo preview labeled.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass.
- [ ] 390px mobile, 768px tablet, 1440px desktop checks; keyboard and contrast review.
- [ ] Real production Vercel URL, Supabase RLS tested, browser refresh/resume, valid docs.

### Run budget defaults (tunable)
- 1 concurrent run per authenticated user; 5 demo runs/day globally unless quota allows more.
- Maximum 2 repair attempts; <= 8 model calls/run; per-call input/output token limits.
- Sandbox hard cutoff of approximately 120 seconds per test phase as configured/available, with eventual cleanup.
- Error input <= 12,000 chars; <= 40 repository files discovered/selected; <= 100 KB source content per analysis slice.

## 15. Timeline (actual remaining time is short)

**Day 1 — Foundation:** scaffold, Supabase Auth/RLS and migrations, Nemotron proof-of-call, fixture repo, landing shell. Gate: authentic `/api/ai/health` server-side model request works; don't proceed if model inaccessible.

**Day 2 — Agent + sandbox:** GitHub ingest, baseline test, model investigation, validated patch, isolated candidate test, event persistence. Gate: baseline red → patched green with authentic outputs at least once.

**Day 3 — UX + PR:** premium timeline, diff and proof view, auth/permissions, PR approval and idempotency, validation/security. Gate: entire journey completes on Vercel staging.

**Final day, before deadline — Ship:** 3 repeat runs, capture screenshots/video, README/license feedback, deployment secrets audit, Devpost submission with buffer.

**Execution priority:** Model access → real sandbox verification → coherent visual proof → demo video → PR creation improvements. If behind schedule, drop email, multi-repo support and extras before compromising functional core.

## 16. Definition of Done and acceptance gate

Product is **done** only if (a) live link works; (b) NVIDIA open-source model is genuinely invoked through Nebius at runtime; (c) baseline and patched tests are independently executed; (d) the resulting proof is truthful and reviewable; (e) a user can review the diff and, when authorized, create a draft PR; (f) source code and setup/docs are public and complete; (g) the YouTube under-3-minute video shows the actual product; and (h) Devpost submission is complete by the deadline.

### Launch blockers
- Static mocked activity presented as live agent execution.
- Agent's patch/test result not reproducible or provenance missing.
- No actual NVIDIA/Nebius runtime integration.
- Secret tokens exposed to the browser/sandbox or GitHub.
- Untrusted execution in normal Vercel function or host.
- Public site gives unauthenticated write access to GitHub or cloud resources.

## 17. Demo video plan (target 2:35–2:50)

- **0:00–0:15** Hook: “A failing repo. An incident. A verified draft fix.” Show actual error.
- **0:15–0:35** Enter repo/error; highlight Nebius/NVIDIA inference integration.
- **0:35–1:25** Agent inspects source, identifies cause, proposes patch; display meaningful real events.
- **1:25–2:00** Baseline red vs patched green with real command/exit-code evidence; inspect diff.
- **2:00–2:25** Approve and show real draft GitHub PR (only if feature works).
- **2:25–2:45** Architecture and measurable impact; clear CTA for judge to test demo.

Screenshots: landing, incident timeline, side-by-side test results, diff, optional PR. Do not use borrowed footage/music/trademarks without rights.

## 18. Submission checklist

- [ ] Devpost Coding and Agentic Engineering track selected.
- [ ] Hosted working Vercel URL + guest-accessible demonstration instructions.
- [ ] Public GitHub URL, open-source LICENSE recognized at repo root, README.
- [ ] YouTube video publicly accessible and shorter than 3 minutes.
- [ ] Summary of Nemotron model version/ID and exact Token Factory endpoint integration.
- [ ] Explain how agent plans/writes/tests/iterates autonomously.
- [ ] Honest performance metrics and screenshots from working run.
- [ ] Nebius/NVIDIA feedback submitted.
- [ ] Demo accessible through judging period.

## 19. Open technical risks / decisions

| Risk | Mitigation / decision |
|---|---|
| Nemotron chosen model unavailable under credit account | Fetch model catalog early; choose supported NVIDIA open-source model, document exact used ID. |
| Vercel Sandbox billing/capacity/access differs from app hosting | Verify Sandbox access/price immediately, run a smoke test; use a separate truly isolated runner if needed; no host shell fallback. |
| Vercel function runtime limit interrupts long runs | Bounded resumable stages, DB-persisted state, timeout/error handling; no hidden background promise. |
| GitHub PR token permission/ownership | Start with owned demo fixture; minimum privileges, explicit approval, verified PR call. |
| Ambiguous baseline results | Strict inconclusive state; choose deterministic tests and actual failing regression. |
| Credits exhausted | Model budgets, caching only of repo metadata (not fake outcomes), enforce limits, prioritize one polished complete path. |
| Supabase MCP permissions too broad | Development project, project-specific URL, OAuth, approve mutations; don't connect public runtime to MCP. |

## 20. Primary source links

- Hackathon rules: https://nebiusglobalaihackathon.devpost.com/rules
- Judging: https://nebiusglobalaihackathon.devpost.com/updates/46204-here-s-how-judging-works
- Nemotron on Token Factory: https://nebius.com/services/token-factory/nemotron
- Supabase MCP: https://supabase.com/docs/guides/ai-tools/mcp
- Antigravity MCP: https://www.antigravity.google/docs/mcp
- Antigravity Skills: https://www.antigravity.google/docs/skills
- Vercel Sandbox: https://vercel.com/docs/sandbox
- Vercel functions limits: https://vercel.com/docs/functions/limitations

---
**Scope authority:** If time is limited, ship the smallest **genuinely functioning** closed-loop fix with transparent evidence, not a broad mock platform. Check current API details as you implement; this PRD is a product specification, not a claim that the application has already been built or deployed.
