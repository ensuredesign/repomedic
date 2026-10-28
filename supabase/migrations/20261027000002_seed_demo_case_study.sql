-- RepoMedic Curated Read-Only Demo Case Study Seed
-- Clearly marked with is_demo = true so guest judges can inspect an end-to-end
-- recorded artifact on /demo without exposing any private user rows.

do $$
declare
  v_demo_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_incident_id uuid := '11111111-1111-4111-8111-111111111101';
  v_run_id uuid := '22222222-2222-4222-8222-222222222201';
  v_patch_id uuid := '33333333-3333-4333-8333-333333333301';
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    v_demo_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo-case-study@repomedic.local',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RepoMedic Recorded Case Study"}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into public.incidents (
    id,
    user_id,
    repository_full_name,
    repository_id,
    base_sha,
    error_text_redacted,
    title,
    affected_file_hint,
    is_demo,
    created_at
  )
  values (
    v_incident_id,
    v_demo_user_id,
    'ensuredesign/repomedic-fixture',
    'fixture-buggy-order-service',
    '440255c3e1efe73a24d2cd92b90055c54c3e3549',
    E'FAIL tests/pricing.test.ts > calculateOrderInvoice > 5. honors explicit 0% tax rate for tax-exempt B2B orders\nAssertionError: expected 8.5 to be 0 // Object.is equality\n  at tests/pricing.test.ts:62:36\n  Expected taxRatePercent: 0\n  Received taxRatePercent: 8.5 (taxCents: 1700 on $200.00 tax-exempt B2B order)',
    'B2B tax-exempt orders (0% taxRatePercent) erroneously charged 8.5% default tax',
    'src/pricing.ts',
    true,
    now() - interval '15 minutes'
  )
  on conflict (id) do nothing;

  insert into public.runs (
    id,
    incident_id,
    user_id,
    status,
    attempt_count,
    current_stage,
    model_id,
    input_tokens,
    output_tokens,
    estimated_cost_usd,
    started_at,
    finished_at,
    diagnosis_json,
    is_demo,
    created_at
  )
  values (
    v_run_id,
    v_incident_id,
    v_demo_user_id,
    'verified',
    1,
    'awaiting_approval',
    'nvidia/nemotron-3-super-120b-a12b',
    1420,
    580,
    0.001200,
    now() - interval '14 minutes',
    now() - interval '13 minutes 18 seconds',
    jsonb_build_object(
      'provenance', 'recorded_case_study',
      'rootCause', 'In src/pricing.ts (line 45), resolveTaxRatePercent uses logical OR (taxRatePercent || defaultRatePercent), which treats a numeric 0% tax rate as falsy and falls back to 8.5%.',
      'confidenceLabel', 'high_evidence',
      'evidencePaths', jsonb_build_array(
        jsonb_build_object('path', 'src/pricing.ts', 'lines', '40-49', 'reason', 'Logical OR fallback overrides explicit 0% tax rate'),
        jsonb_build_object('path', 'tests/pricing.test.ts', 'lines', '55-65', 'reason', 'Failing regression test for B2B tax-exempt order ORD-105-B2B-EXEMPT')
      ),
      'repairPlan', 'Replace logical OR (||) with nullish coalescing (??) in resolveTaxRatePercent so only null or undefined falls back to defaultRatePercent.'
    ),
    true,
    now() - interval '14 minutes'
  )
  on conflict (id) do nothing;

  insert into public.patches (
    id,
    run_id,
    user_id,
    attempt_number,
    unified_diff,
    diff_sha256,
    touched_paths,
    rationale,
    risk_notes,
    is_demo,
    created_at
  )
  values (
    v_patch_id,
    v_run_id,
    v_demo_user_id,
    1,
    E'--- a/src/pricing.ts\n+++ b/src/pricing.ts\n@@ -43,7 +43,7 @@ export function resolveTaxRatePercent(\n   taxRatePercent?: number | null,\n   defaultRatePercent = DEFAULT_TAX_RATE_PERCENT,\n ): number {\n-  const effective = taxRatePercent || defaultRatePercent;\n+  const effective = taxRatePercent ?? defaultRatePercent;\n   if (effective < 0 || effective > 100) {\n     throw new RangeError(`Invalid tax rate percentage: ${effective}`);\n   }\n',
    encode(digest(E'--- a/src/pricing.ts\n+++ b/src/pricing.ts\n@@ -43,7 +43,7 @@ export function resolveTaxRatePercent(\n   taxRatePercent?: number | null,\n   defaultRatePercent = DEFAULT_TAX_RATE_PERCENT,\n ): number {\n-  const effective = taxRatePercent || defaultRatePercent;\n+  const effective = taxRatePercent ?? defaultRatePercent;\n   if (effective < 0 || effective > 100) {\n     throw new RangeError(`Invalid tax rate percentage: ${effective}`);\n   }\n', 'sha256'), 'hex'),
    array['src/pricing.ts'],
    'Use nullish coalescing (??) instead of logical OR (||) in resolveTaxRatePercent so explicit 0% tax-exempt rates are preserved while null/undefined still default to 8.5%.',
    'Minimal 1-line change in resolveTaxRatePercent; matches resolveDiscountPercent behavior on line 34. Does not alter rounding or range validation.',
    true,
    now() - interval '13 minutes 35 seconds'
  )
  on conflict (run_id, attempt_number) do nothing;

  insert into public.test_results (
    id,
    run_id,
    user_id,
    patch_id,
    kind,
    command,
    exit_code,
    passed,
    failed,
    duration_ms,
    stdout_excerpt,
    stderr_excerpt,
    is_demo,
    created_at
  )
  values
  (
    '44444444-4444-4444-8444-444444444401',
    v_run_id,
    v_demo_user_id,
    null,
    'baseline',
    'pnpm vitest run',
    1,
    7,
    1,
    1480,
    E' RUN  v3.2.7 /vercel/sandbox/workspace\n ❯ tests/pricing.test.ts (8 tests | 1 failed)\n   ✓ 1. calculates standard retail order subtotal, default 8.5% tax, and shipping\n   ✓ 2. applies explicit promotional percentage discount accurately\n   ✓ 3. grants free shipping when post-discount subtotal meets threshold ($100.00)\n   ✓ 4. honors explicit 0% promotional discount override without falling back to loyalty tier\n   × 5. honors explicit 0% tax rate for tax-exempt B2B orders\n     → expected 8.5 to be +0 // Object.is equality\n   ✓ 6. falls back to default 8.5% tax rate when taxRatePercent is null or undefined\n   ✓ 7. rejects orders with negative item price or zero quantity\n   ✓ 8. rounds fractional cent tax and discount amounts deterministically\n\n Test Files  1 failed (1)\n      Tests  1 failed | 7 passed (8)',
    '',
    true,
    now() - interval '13 minutes 50 seconds'
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    v_run_id,
    v_demo_user_id,
    v_patch_id,
    'candidate',
    'pnpm vitest run',
    0,
    8,
    0,
    1390,
    E' RUN  v3.2.7 /vercel/sandbox/workspace\n ✓ tests/pricing.test.ts (8 tests)\n   ✓ 1. calculates standard retail order subtotal, default 8.5% tax, and shipping\n   ✓ 2. applies explicit promotional percentage discount accurately\n   ✓ 3. grants free shipping when post-discount subtotal meets threshold ($100.00)\n   ✓ 4. honors explicit 0% promotional discount override without falling back to loyalty tier\n   ✓ 5. honors explicit 0% tax rate for tax-exempt B2B orders\n   ✓ 6. falls back to default 8.5% tax rate when taxRatePercent is null or undefined\n   ✓ 7. rejects orders with negative item price or zero quantity\n   ✓ 8. rounds fractional cent tax and discount amounts deterministically\n\n Test Files  1 passed (1)\n      Tests  8 passed (8)',
    '',
    true,
    now() - interval '13 minutes 20 seconds'
  )
  on conflict (id) do nothing;

  insert into public.run_events (run_id, user_id, seq, stage, event_type, summary, payload, is_demo, created_at)
  values
    (v_run_id, v_demo_user_id, 1, 'fetching', 'stage_completed', 'Fetched pinned commit a4f91c2b8e0d from allowlisted fixture repository (4 files, 6.2 KB)', '{"provenance":"recorded_case_study","filesCount":4}'::jsonb, true, now() - interval '13 minutes 58 seconds'),
    (v_run_id, v_demo_user_id, 2, 'baseline_running', 'test_completed', 'Baseline test suite reproduced failure: exit code 1 (7 passed, 1 failed in tests/pricing.test.ts)', '{"exitCode":1,"passed":7,"failed":1,"durationMs":1480}'::jsonb, true, now() - interval '13 minutes 50 seconds'),
    (v_run_id, v_demo_user_id, 3, 'investigating', 'diagnosis_completed', 'NVIDIA Nemotron identified root cause in src/pricing.ts:45 (logical OR treats 0% tax rate as falsy)', '{"model":"nvidia/nemotron-3-super-120b-a12b","confidenceLabel":"high_evidence"}'::jsonb, true, now() - interval '13 minutes 40 seconds'),
    (v_run_id, v_demo_user_id, 4, 'patch_generating', 'patch_proposed', 'Generated minimal 1-line candidate patch (attempt 1/2) touching src/pricing.ts', '{"attempt":1,"touchedPaths":["src/pricing.ts"]}'::jsonb, true, now() - interval '13 minutes 35 seconds'),
    (v_run_id, v_demo_user_id, 5, 'patch_testing', 'test_completed', 'Isolated post-patch test suite passed: exit code 0 (8 passed, 0 failed in tests/pricing.test.ts)', '{"exitCode":0,"passed":8,"failed":0,"durationMs":1390}'::jsonb, true, now() - interval '13 minutes 20 seconds'),
    (v_run_id, v_demo_user_id, 6, 'verified', 'verification_succeeded', 'Proof of Fix verified: baseline failure resolved and all 8 tests pass on identical suite.', '{"status":"verified","awaitingApproval":true}'::jsonb, true, now() - interval '13 minutes 18 seconds')
  on conflict (run_id, seq) do nothing;
end
$$;
