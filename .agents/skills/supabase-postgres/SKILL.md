---
name: supabase-postgres
description: Applies safe Supabase Auth, PostgreSQL migrations, RLS ownership policies, event persistence, and project-scoped MCP development practices in RepoMedic.
---

# Supabase/Postgres Engineering

1. Supabase MCP is for **developer tooling**, never exposed directly to public RepoMedic users. Connect only to owned dev project; use project_ref scoping and OAuth; obtain approval before migrations or destructive queries.
2. Write versioned migration SQL in `supabase/migrations`, with foreign keys, indexes, constraints and row-level security enabled on every user-owned table. No production data copying.
3. Enforce owner authorization in Next.js server routes and RLS even when no UI route shows cross-user data. Service-role bypasses RLS; never rely on browser checks when using it.
4. Add consistency: unique event sequence per run, one pull request record per run, approval linked to exact patch hash, idempotency claims/leases with expiration.
5. Store timestamps with timezone, raw incident data redacted and large logs in private storage with access controls. Maintain payload size limits.
6. Test anonymous, owner and non-owner access for each table and sensitive endpoint; ensure demo public views expose only curated synthetic content.
7. No hardcoded personal access token or MCP credentials in workspace JSON/commits. Official docs: https://supabase.com/docs/guides/ai-tools/mcp
