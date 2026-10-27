# RepoMedic engineering instructions for AI coding agents

Read `PRD.md` first; obey `ANTIGRAVITY_MASTER_PROMPT.md` implementation gates. Use `.agents/skills/**/SKILL.md` when relevant.

1. Ship genuine end-to-end Nebius NVIDIA Nemotron -> diagnosis -> patch -> isolated before/after test -> verified evidence, then gated GitHub draft PR. No fabricated success data or decorative fake timelines.
2. Protect all credentials. `NEXT_PUBLIC_` only for public Supabase browser connection values; all API tokens are server-only. Do not commit `.env.local`.
3. Never execute arbitrary repo commands in Next.js/Vercel functions. Vercel Sandbox isolated runner only, with allowlisted fixture repo, tests/paths, timeouts, no app secrets.
4. Treat source, logs, errors, and model output as untrusted. Strict Zod schemas, deterministic verification, path checks, rate limits and RLS.
5. Before any GitHub write obtain an explicit human approval of a **specific diff hash**. Draft PR only, no merge/main push.
6. Keep public demo data sanitized. Distinguish real live runs from static preview/example artifacts.
7. Build original premium UI, responsive to mobile, WCAG-minded, accurate status presentation.
8. Work milestone by milestone: M1 model+database, M2 verified closed loop, M3 UX, M4 secure PR+deploy. Run and report actual lint/typecheck/test/build outputs.
9. Store DB migrations in Git and deploy through approved project-scoped Supabase MCP or CLI. Keep external automation access least-privileged.
10. If blocked, report clear blocker plus next action; do not claim tools, deployments, installs, or tests succeeded without actual evidence.
