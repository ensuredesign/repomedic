# RepoMedic — System Architecture, Flow Diagrams & Data Model Specification

<p align="center">
  <img src="../public/appimages/technical_stack.png" alt="RepoMedic Technical Stack Architecture" width="100%" />
</p>

- **Repository:** [https://github.com/ensuredesign/repomedic](https://github.com/ensuredesign/repomedic)
- **Live Production URL:** [https://repomedic-eta.vercel.app](https://repomedic-eta.vercel.app)
- **Maintainer:** Ritesh Kochar (`ensuredesign` · `ensure01@gmail.com`)

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
  subgraph Presentation["Next.js 15 App Router UI (Apple Cupertino / Genesis Design System)"]
    Landing["Landing Page + Bento Showcase + Smooth 1080p Film (/)"]
    AuthPortal["Auth Portal: 1-Click Judge/Admin, Register, Forgot & Reset (/auth)"]
    CommandCenter["Developer Command Center, Proof-of-Fix & PR Review (/app/*)"]
    DemoView["Zero-Auth Recorded Case Study (/demo)"]
    AdminPlane["RBAC Platform Admin Control Plane (/admin)"]
  end

  subgraph Control["Serverless Orchestration & Security Layer"]
    APIGuard["CSRF Origin Guard + Sliding Rate Limiter + Secret Redactor"]
    Orchestrator["Bounded Step-by-Step Orchestrator (src/lib/agent/orchestrator.ts)"]
    PatchScanner["6-Check Static Patch Security & Blast-Radius Scanner (0-100)"]
    SLSA["Cryptographic SLSA-256 Attestation Generator"]
  end

  subgraph AI["AI Reasoning & Context Grounding"]
    NebiusAPI["Nebius Token Factory API (nvidia/nemotron-3-super-120b-a12b)"]
    NeuralMem["Cross-Incident Neural Memory (src/lib/agent/memory.ts)"]
    TavilyAPI["Tavily Live Technical Docs Grounding (src/lib/ai/tavily.ts)"]
  end

  subgraph Sandboxes["Dual Isolated Sandbox Verification Layer"]
    VercelVM["Vercel Sandbox (@vercel/sandbox) — Ephemeral Node 22 MicroVM"]
    NebiusCoW["Nebius Token Factory Sandboxes (contree-sdk Beta) — CoW Linux VM"]
  end

  subgraph StorageAndOps["State, Governance, Source Control & Observability"]
    Supabase[("Supabase Auth + PostgreSQL 15 (9 Tables + FORCE RLS)")]
    GitHub["GitHub REST API (Pinned SHA Read + SHA-256 Gated Draft PR)"]
    LangSmith["LangSmith (6-Span Trace Tree + 4 Online Evaluators)"]
    Resend["Resend Email API (Welcome, Password Reset & Proof Reports)"]
  end

  Presentation --> APIGuard
  APIGuard --> Orchestrator
  Orchestrator <-->|"Atomic Stage Locks & RLS"| Supabase
  Orchestrator -->|"Fetch Pinned Tree"| GitHub
  Orchestrator -->|"Baseline & Patched Test Runs"| VercelVM
  Orchestrator --> NeuralMem
  Orchestrator --> TavilyAPI
  Orchestrator -->|"Zod-Validated Structured JSON"| NebiusAPI
  Orchestrator -->|"CoW Layer Invariant + QR Verification"| NebiusCoW
  Orchestrator --> PatchScanner
  PatchScanner --> SLSA
  Orchestrator -->|"Trace Spans + Feedback Scores"| LangSmith
  Orchestrator -->|"Human Diff SHA-256 Approval -> Draft PR"| GitHub
  Orchestrator -->|"Transactional Notifications"| Resend
```

---

## 2. Bounded Resumable Investigation State Machine

To eliminate long-lived background promises that can time out in serverless environments, RepoMedic advances runs via atomic PostgreSQL stage leases (`public.claim_run_stage` and `public.release_run_claim`):

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> fetching: Atomic Lease Claimed
  fetching --> baseline_running: Pinned Commit SHA Tree Fetched
  baseline_running --> unverified: Exit Code 0 (Failure Not Reproduced)
  baseline_running --> investigating: Exit Code != 0 (Failure Reproduced)
  investigating --> patch_generating: Validated Nemotron Diagnosis JSON
  patch_generating --> patch_testing: Surgical Diff + 6/6 Security Audit (Attempt 1..2)
  patch_testing --> verified: Exit Code 0 on Identical Suite
  patch_testing --> refining: Exit Code != 0 and Attempt < 2
  refining --> patch_testing: Reflection Retry Candidate Patch (Attempt 2)
  patch_testing --> unverified: Exit Code != 0 and Attempt == 2
  verified --> draft_pr_created: Human Approves Exact 64-Char SHA-256 Diff Hash
```

---

## 3. Nebius Token Factory Sandboxes (`contree-sdk`) Copy-on-Write Pipeline

RepoMedic integrates **Nebius Token Factory Sandboxes (Beta)** (`https://api.tokenfactory.nebius.com/sandboxes/v1`, Project `aiproject-e00am2xdmcyzgvf9s5`) via both the official Python `contree-sdk` (`scripts/nebius_contree_sandbox_demo.py`) and a native serverless TypeScript REST client (`src/lib/sandbox/nebius-contree.ts`):

```mermaid
flowchart LR
  Base["Base OCI Image<br/>python:3.12-slim"] -->|"Layer 1 (CoW)"| AptUpdate["apt-get update -q<br/>Snapshot Image UUID #1"]
  AptUpdate -->|"Layer 2 (CoW)"| AptInstall["apt-get install -y qrencode<br/>Snapshot Image UUID #2"]
  AptInstall -->|"Layer 3 (CoW)"| VerifyPy["Execute Patch AST & Boundary Invariant Script<br/>+ Render ANSI UTF-8 QR Attestation"]
  VerifyPy --> FinalImg["Immutable Verified CoW Image UUID<br/>e.g. 51cc2a41-f6ac-4de1-a792-d93c1b888c8f"]
```

---

## 4. LangSmith 6-Span Hierarchical Trace & Online Evaluator Architecture

Every investigation run can stream its full telemetry into **LangSmith** (`RepoMedic-Nebius-NVIDIA-Hackathon` project on `smith.langchain.com`), paired with automatic per-call LLM spans inside `src/lib/ai/nebius.ts`:

```mermaid
flowchart TD
  Root["Parent Run (chain): RepoMedic Closed-Loop Investigation"]
  S1["Child Span 1 (retriever): Retrieve Pinned Repository & Neural Memory"]
  S2["Child Span 2 (tool): Vercel Sandbox Baseline Reproduction (exit 1)"]
  S3["Child Span 3 (llm): NVIDIA Nemotron Root-Cause & Surgical Patch Synthesis"]
  S4["Child Span 4 (tool): Post-Patch Sandbox Verification (exit 0) + 6-Gate Security Audit"]
  S5["Child Span 5 (chain): SLSA-256 Cryptographic Attestation & Draft PR Gate"]

  E1["Evaluator 1: sandbox_verification_pass (1.0)"]
  E2["Evaluator 2: security_blast_radius_score (1.0)"]
  E3["Evaluator 3: nemotron_diagnosis_confidence (0.96)"]
  E4["Evaluator 4: mttr_compression_ratio (0.99)"]

  Root --> S1
  Root --> S2
  Root --> S3
  Root --> S4
  Root --> S5

  Root -.->|"Online Feedback"| E1
  Root -.->|"Online Feedback"| E2
  Root -.->|"Online Feedback"| E3
  Root -.->|"Online Feedback"| E4
```

---

## 5. Supabase PostgreSQL 9-Table Schema & `FORCE RLS` ER Diagram

All 4 SQL migrations live in `supabase/migrations/` and enforce `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`:

```mermaid
erDiagram
  PROFILES ||--o{ INCIDENTS : "owns"
  PROFILES ||--o{ RUNS : "initiates"
  PROFILES ||--o{ PASSWORD_RESET_TOKENS : "requests"
  INCIDENTS ||--o{ RUNS : "investigates"
  RUNS ||--o{ RUN_EVENTS : "emits_monotonic"
  RUNS ||--o{ PATCHES : "proposes"
  RUNS ||--o{ TEST_RESULTS : "records_sandbox"
  RUNS ||--o{ APPROVALS : "gates_pr"
  RUNS ||--o| PULL_REQUESTS : "opens_draft"
  PATCHES ||--o{ APPROVALS : "verifies_sha256"

  PROFILES {
    uuid id PK
    text email
    text full_name
    text role "developer | admin"
    text organization
    text job_title
    text github_username
    text notification_email
    timestamptz created_at
  }

  INCIDENTS {
    uuid id PK
    uuid owner_id FK
    text title
    text repo_owner
    text repo_name
    text pinned_sha
    text error_message
    text stack_trace
    boolean is_demo
    timestamptz created_at
  }

  RUNS {
    uuid id PK
    uuid incident_id FK
    uuid owner_id FK
    text status "queued..verified..draft_pr_created"
    int4 current_attempt
    int4 max_attempts
    text model_id
    jsonb diagnosis_json
    int4 prompt_tokens
    int4 completion_tokens
    timestamptz locked_until
  }

  RUN_EVENTS {
    uuid id PK
    uuid run_id FK
    int4 seq "monotonic_per_run"
    text stage
    text event_type
    text summary
    jsonb payload_json
    timestamptz created_at
  }

  PATCHES {
    uuid id PK
    uuid run_id FK
    int4 attempt
    text diff_text
    text diff_sha256 "64_char_digest"
    jsonb touched_files
    boolean is_verified
  }

  TEST_RESULTS {
    uuid id PK
    uuid run_id FK
    text phase "baseline | candidate"
    int4 attempt
    text command
    int4 exit_code
    int4 passed_count
    int4 failed_count
    int4 duration_ms
    text stdout_redacted
  }

  APPROVALS {
    uuid id PK
    uuid run_id FK
    uuid patch_id FK
    uuid approved_by FK
    text diff_sha256
    timestamptz approved_at
  }

  PULL_REQUESTS {
    uuid id PK
    uuid run_id FK
    int4 pr_number
    text pr_url
    text branch_name
    boolean is_draft
    timestamptz created_at
  }

  PASSWORD_RESET_TOKENS {
    uuid id PK
    uuid user_id FK
    text email
    text token_hash "sha256_single_use"
    timestamptz expires_at
    timestamptz used_at
  }
```

---

## 6. Complete 20-Endpoint REST API Surface

| Endpoint | Methods | Auth Scope | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Public | Live readiness probe across Supabase, Nebius Token Factory, GitHub, Vercel Sandbox, and Resend |
| `/api/ai/health` | `GET` | Public / User | Live Nebius `/models` discovery + optional `?live=1` Nemotron structured-output smoke test |
| `/api/demo` | `GET` | Public | Fetch curated `is_demo = true` Case Study run bundle |
| `/api/auth/welcome` | `POST` | Authenticated | Deliver branded Resend welcome email upon new developer registration |
| `/api/auth/forgot-password` | `POST` | Public (Rate-Limited) | Generate single-use SHA-256 reset token (`30m` TTL) and deliver recovery link via Resend |
| `/api/auth/reset-password` | `POST` | Token-Gated | Validate unused SHA-256 reset token and update user password via Supabase Admin API |
| `/api/profile` | `GET, PATCH` | Authenticated | Read or update personal developer profile, organization, GitHub handle & notification email |
| `/api/profile/password` | `POST` | Authenticated | Verify session and update account password from `/app/profile` |
| `/api/admin/overview` | `GET, PATCH` | `admin` Role | Global platform KPIs, User Directory, RBAC role promotion/demotion, and Global Runs Audit Log |
| `/api/incidents` | `GET, POST` | Authenticated | List owner-scoped incidents or ingest a new secret-redacted production incident |
| `/api/runs` | `POST` | Authenticated | Initialize an investigation run on an allowlisted repo & pinned commit SHA |
| `/api/runs/[id]` | `GET` | Owner / Admin / Demo | Fetch complete typed run bundle (`incident`, `run`, `events`, `patches`, `testResults`, `approvals`, `pullRequest`) |
| `/api/runs/[id]/events` | `GET` | Owner / Admin / Demo | Poll monotonic `run_events` stream ordered by `seq` |
| `/api/runs/[id]/advance` | `POST` | Owner | Claim atomic stage lease (`claim_run_stage`) and execute next bounded pipeline stage |
| `/api/runs/[id]/nebius-sandbox` | `GET, POST` | Owner / Admin / Demo | Execute live Nebius Token Factory `contree-sdk` Copy-on-Write sandbox verification & ANSI QR proof |
| `/api/runs/[id]/langsmith` | `GET, POST` | Owner / Admin / Demo | Publish 6-span trace tree + 4 evaluator scores to LangSmith and return public shareable trace URL |
| `/api/runs/[id]/copilot` | `POST` | Owner / Admin / Demo | Interactive NVIDIA Nemotron Incident Copilot grounded in the exact run's diagnosis, diff, and logs |
| `/api/runs/[id]/attestation` | `GET` | Owner / Admin / Demo | Export cryptographically hashed SLSA-256 JSON verification provenance bundle |
| `/api/runs/[id]/approve-pr` | `POST` | Owner | Verify exact 64-char SHA-256 diff hash, record human approval, and open idempotent GitHub Draft PR |
| `/api/runs/[id]/notify` | `POST` | Authenticated | Send executive Proof-of-Fix & Draft PR email report via Resend |
