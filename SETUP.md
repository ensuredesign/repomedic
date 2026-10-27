# RepoMedic — Antigravity, Supabase MCP, GitHub, and Vercel setup

This package gives you a PRD, copy/paste agent prompt, and **five original, project-local Antigravity skills**. It does **not** install apps, create cloud accounts, or deploy code automatically. You or the Antigravity agent must run the authorized setup in your own environment.

## 1. Start a new project

1. Create a folder/repository named `repomedic` and open it in Antigravity 2.0.
2. Copy `PRD.md`, `ANTIGRAVITY_MASTER_PROMPT.md`, `AGENTS.md`, and the entire `.agents/skills/` folder into the **root of the workspace**.
3. Open Antigravity's Customizations > Skills and verify the five workspace skills are detected. Native skill paths use `.agents/skills/<skill-name>/SKILL.md`. If they don't appear, reload your workspace. Official docs: https://www.antigravity.google/docs/skills
4. Paste the content below the `---` separator in `ANTIGRAVITY_MASTER_PROMPT.md` into the Antigravity chat. Approve only scoped safe actions, and inspect important changes.

## 2. Supabase MCP (development only)

- Create a NEW Supabase project for RepoMedic (not one with existing customer/production data).
- In Antigravity 2.0: **Settings (bottom left) > Customizations > Installed MCP Servers > Add MCP**. Find **Supabase** in MCP Store; connect and authenticate with browser OAuth.
- If the store doesn't offer the version you need, configure the official remote MCP server following https://www.antigravity.google/docs/mcp. Project-scoped URL pattern (replace ID):

```json
{
  "mcpServers": {
    "supabase": {
      "serverUrl": "https://mcp.supabase.com/mcp?project_ref=YOUR_SUPABASE_PROJECT_REF&features=database,docs,debugging,development"
    }
  }
}
```

- The workspace config location (if supported on your Antigravity surface) is `.agents/mcp_config.json`; otherwise manage it through the UI/global config. OAuth is strongly preferred over hardcoded access tokens. DO NOT commit sensitive headers/tokens.
- During initial migrations, ask permission for any write/schema tool call. For read-only inspection, add `&read_only=true` to the project-scoped URL, but remove that setting **only when intentionally applying approved migrations**. Keep MCP connected to a **development** project, not production.
- Supabase MCP is NOT part of your customer-facing runtime; the Next.js app uses `@supabase/supabase-js` / SSR auth helpers and normal Supabase URL/keys, with RLS and server authorization. Never expose developer MCP to your end users.
- Helpful official docs: https://supabase.com/docs/guides/ai-tools/mcp and https://supabase.com/docs/guides/ai-tools

## 3. Token Factory / Nemotron

1. Use the $25 credit already claimed; generate a Nebius Token Factory API key inside your account.
2. Verify available model IDs from the provider's model catalog; the docs' example `nvidia/nemotron-3-super-120b-a12b` is a **candidate**, not a guarantee of availability for your account.
3. In `.env.local` (never commit): set `NEBIUS_API_KEY`, `NEBIUS_BASE_URL` and `NEBIUS_MODEL`.
4. Make a **direct server-side** inference request and capture a redacted request/response in development; do not pretend OpenRouter fulfils the direct Token Factory requirement.
5. Official model example: https://nebius.com/services/token-factory/nemotron

## 4. GitHub

1. Create public **application** repo `repomedic` with open-source license, GitHub Actions checks, README, and source.
2. Create a separate small owned demo fixture repo, e.g. `repomedic-fixture`, with deliberate bug and deterministic test suite. Record failing commit SHA.
3. For a solo MVP, GitHub fine-grained PAT scoped **only** to fixture repo may be sufficient; validate that permissions permit branches and draft pull requests. Prefer GitHub App for a real multi-user product.
4. Configure read/write secrets **server-side on Vercel only**; never pass them into sandbox, frontend, logging or model prompts. `GITHUB_ALLOWED_REPOS` is a comma-separated allowlist.
5. Require explicit approval of the exact diff before creating a **draft** PR. If writing to the fixture repo would not be appropriate, use export-patch-only flow transparently.

## 5. Vercel app and Sandbox

1. Connect the `repomedic` GitHub application repository in Vercel; deploy Next.js.
2. Configure environment variables for Production/Preview independently (see `.env.example`). Public `NEXT_PUBLIC_*` values only for the Supabase project URL/anon key. All other credentials server-side.
3. Confirm your Vercel account and plan can use **Vercel Sandbox**, including price/quotas, and run a smoke test **before** implementing the complete executor.
4. `@vercel/sandbox` runs potentially untrusted code in separate isolated microVMs. Do not execute test commands in the Vercel Next.js function environment.
5. Run bounded stage operations; Vercel functions have execution limits. Persist run state in Supabase. If your MVP requires an open browser tab to advance stages, disclose that behavior honestly.
6. Official docs: https://vercel.com/docs/sandbox and https://vercel.com/docs/functions/limitations

## 6. Suggested env template and security

Copy `.env.example` to `.env.local`; never commit `.env.local`.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_IF_NEEDED
NEBIUS_API_KEY=SERVER_ONLY
NEBIUS_BASE_URL=https://api.tokenfactory.us-central1.nebius.com/v1/
NEBIUS_MODEL=nvidia/nemotron-3-super-120b-a12b
GITHUB_TOKEN=SERVER_ONLY_FINE_GRAINED_TOKEN
GITHUB_ALLOWED_REPOS=YOUR_USERNAME/repomedic-fixture
GITHUB_FIXTURE_BASE_SHA=YOUR_KNOWN_FAILING_COMMIT_SHA
# Vercel Sandbox: configure per official Vercel guidance; don't add guessed secrets.
# Optional once working:
RESEND_API_KEY=SERVER_ONLY_OPTIONAL
```

Supabase public key is designed for browser use with proper RLS; the service-role key is **not**. Treat all LLM keys/GitHub tokens as confidential.

## 7. Recommended order of operations

1. Verify Supabase MCP connection and schema/migrations.
2. Verify actual Nebius Nemotron call.
3. Verify Vercel Sandbox smoke test.
4. Create owned reproducible bug fixture and pin SHA.
5. Build closed loop and verify genuine baseline red / patch green.
6. Only then polish UI and approval-gated PR workflow.
7. Deploy, test public demo access, capture the <3-minute video, finish Devpost submission.

## 8. What the supplied skills do

| Local skill | Purpose |
|---|---|
| `premium-ui` | Premium visual language, interactions, responsive/accessibility QA |
| `agent-reliability` | Nemotron schemas, state machine, bounded retries, evidence audit |
| `supabase-postgres` | Auth, RLS, migrations, project-scoped MCP safety |
| `github-pr-safety` | Secure repo reads, patch validation, approval-gated draft PR |
| `vercel-quality` | Sandbox, test automation, deployment, screenshots, checks |

You can additionally use officially vetted Supabase agent skills or Antigravity marketplace plugins after inspecting permissions and docs. Avoid bulk installing unreviewed third-party skill repositories just to inflate the list.

## 9. What is not yet done

No GitHub repo, Supabase project, MCP connection, Vercel deployment, environment variables, or running application were created by this package. These files are a **ready-to-import project specification and local skill pack**.
