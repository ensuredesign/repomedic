---
name: vercel-quality
description: Deploys and tests RepoMedic on Vercel, integrates Vercel Sandbox for isolated test execution, checks serverless runtime limits, and runs reproducible QA/build gates.
---

# Vercel Sandbox, Deployment and QA

1. Use official `@vercel/sandbox` docs to create/stop isolated ephemeral microVMs. Verify access, SDK/version and costs before promising live demo.
2. Never run untrusted repository commands inside app's Next.js route handlers. Never inject secrets into sandbox environments. Sanitize logs and enforce timeouts/allowed commands.
3. Verify limits: Vercel Function max duration varies by plan/settings; keep operations bounded, persist state, and expose pause/resume if browser advances stages.
4. Add CI with install, lint, typecheck, unit tests, build; add Playwright smoke on desktop/mobile and important navigation/errors.
5. Test the **deployed** app with production environment settings. A successful local dev screenshot is not deployment proof.
6. Collect actual run telemetry and ensure no secret leaks or mock results; document run limitations, costs and rate limiting.
7. Never overwrite production deployment settings or environment variables without authorization; suggest preview deploy first.
8. Maintain clean README quickstart, `.env.example`, deployment instructions, and <3-minute demo plan.

Official docs: https://vercel.com/docs/sandbox and https://vercel.com/docs/functions/limitations
