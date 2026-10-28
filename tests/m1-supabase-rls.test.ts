import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabaseFetchWithRetry } from '@/lib/supabase/client';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://repomedic-sb.propixer.in';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc5MzExODA2MCwiZXhwIjo0OTQ4NzkxNjYwLCJyb2xlIjoiYW5vbiJ9.vS2m_mrjdEOo4NBjjiywvIswD7cNjsFGo1goXcU8uAE';

function makeAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: supabaseFetchWithRetry },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe('Milestone 1 Gate — Live Supabase Auth, Schema, Atomic RPCs, and RLS Ownership', () => {
  it('1. allows anonymous read of curated is_demo=true case study and blocks anonymous writes', async () => {
    const anon = makeAnonClient();

    const { data: demoIncidents, error: demoErr } = await anon
      .from('incidents')
      .select('id, title, is_demo')
      .eq('is_demo', true);

    expect(demoErr).toBeNull();
    expect(demoIncidents).toBeTruthy();
    expect(demoIncidents!.length).toBeGreaterThanOrEqual(1);
    expect(demoIncidents![0].is_demo).toBe(true);

    const { error: anonInsertErr } = await anon.from('incidents').insert({
      user_id: '00000000-0000-0000-0000-000000000001',
      repository_full_name: 'ensuredesign/repomedic-fixture',
      base_sha: '440255c3e1efe73a24d2cd92b90055c54c3e3549',
      title: 'Unauthorized anon insert attempt',
      error_text_redacted: 'Error: should be rejected by RLS policy',
      is_demo: false,
    });

    expect(anonInsertErr).not.toBeNull();
  });

  it('2. enforces strict owner isolation between two authenticated users and validates atomic stage claims', async () => {
    const clientA = makeAnonClient();
    const clientB = makeAnonClient();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const emailA = `owner-a-${suffix}@repomedic.local`;
    const emailB = `owner-b-${suffix}@repomedic.local`;
    const password = 'RepoMedicTest!2026';

    const { data: signUpA, error: errSignUpA } = await clientA.auth.signUp({
      email: emailA,
      password,
    });
    expect(errSignUpA).toBeNull();
    if (!signUpA.session) {
      await clientA.auth.signInWithPassword({ email: emailA, password });
    }
    const userA = signUpA.user!;
    expect(userA).toBeTruthy();

    const { data: signUpB, error: errSignUpB } = await clientB.auth.signUp({
      email: emailB,
      password,
    });
    expect(errSignUpB).toBeNull();
    if (!signUpB.session) {
      await clientB.auth.signInWithPassword({ email: emailB, password });
    }
    const userB = signUpB.user!;
    expect(userB).toBeTruthy();

    // User A inserts a private incident
    const { data: incA, error: incErrA } = await clientA
      .from('incidents')
      .insert({
        user_id: userA.id,
        repository_full_name: 'malinikochar/repomedic-fixture',
        base_sha: 'a4f91c2b8e0d413792b6c7a0e51d984f3c21b001',
        title: 'M1 RLS Verification Incident',
        error_text_redacted: 'AssertionError: expected 8.5 to be 0 at pricing.test.ts:63',
        is_demo: false,
      })
      .select('*')
      .single();

    expect(incErrA).toBeNull();
    expect(incA?.user_id).toBe(userA.id);

    // User A cannot forge is_demo = true
    const { error: forgeDemoErr } = await clientA.from('incidents').insert({
      user_id: userA.id,
      repository_full_name: 'ensuredesign/repomedic-fixture',
      base_sha: '440255c3e1efe73a24d2cd92b90055c54c3e3549',
      title: 'Forged demo flag attempt',
      error_text_redacted: 'AssertionError: forged demo',
      is_demo: true,
    });
    expect(forgeDemoErr).not.toBeNull();

    // User A creates a run and appends an event via RPC
    const { data: runA, error: runErrA } = await clientA
      .from('runs')
      .insert({
        incident_id: incA.id,
        user_id: userA.id,
        status: 'fetching',
        current_stage: 'fetching',
        model_id: 'nvidia/nemotron-3-super-120b-a12b',
        is_demo: false,
      })
      .select('*')
      .single();

    expect(runErrA).toBeNull();
    expect(runA?.id).toBeTruthy();

    // Claim stage lock atomically as User A
    const { data: claim1, error: claim1Err } = await clientA.rpc('claim_run_stage', {
      p_run_id: runA.id,
      p_claim_token: 'token-1',
      p_lease_seconds: 60,
    });
    expect(claim1Err).toBeNull();
    expect(claim1).toHaveLength(1);

    // Concurrent second claim while lease is active returns 0 rows
    const { data: claim2, error: claim2Err } = await clientA.rpc('claim_run_stage', {
      p_run_id: runA.id,
      p_claim_token: 'token-2',
      p_lease_seconds: 60,
    });
    expect(claim2Err).toBeNull();
    expect(claim2).toHaveLength(0);

    // Release claim and append event
    await clientA.rpc('release_run_claim', {
      p_run_id: runA.id,
      p_claim_token: 'token-1',
    });

    const { data: ev1, error: ev1Err } = await clientA.rpc('append_run_event', {
      p_run_id: runA.id,
      p_stage: 'fetching',
      p_event_type: 'test_event',
      p_summary: 'Verified monotonic sequence allocation',
      p_payload: { ok: true },
    });
    expect(ev1Err).toBeNull();
    expect(ev1.seq).toBe(1);

    // User B attempts to read User A's private incident & run -> blocked by RLS
    const { data: bSeesIncident } = await clientB
      .from('incidents')
      .select('*')
      .eq('id', incA.id);
    expect(bSeesIncident).toEqual([]);

    const { data: bSeesRun } = await clientB
      .from('runs')
      .select('*')
      .eq('id', runA.id);
    expect(bSeesRun).toEqual([]);

    // Cleanup test incident as owner User A
    const { error: delErr } = await clientA
      .from('incidents')
      .delete()
      .eq('id', incA.id);
    expect(delErr).toBeNull();
  });

  it('3. verifies 1-Click Demo Admin & Developer accounts, Profile updates, and RBAC privilege guard', async () => {
    const devClient = makeAnonClient();
    const adminClient = makeAnonClient();

    const { data: devAuth, error: devAuthErr } = await devClient.auth.signInWithPassword({
      email: 'judge@repomedic.dev',
      password: 'RepoMedicJudge!2026',
    });
    expect(devAuthErr).toBeNull();
    expect(devAuth.user?.email).toBe('judge@repomedic.dev');

    // Developer can update their own profile fields
    const { data: updatedDevProfile, error: updateDevErr } = await devClient
      .from('profiles')
      .update({
        job_title: 'Staff AI & Systems Engineer',
      })
      .eq('id', devAuth.user!.id)
      .select('*')
      .single();
    expect(updateDevErr).toBeNull();
    expect(updatedDevProfile?.role).toBe('developer');

    // Developer cannot self-escalate role to admin (blocked by trigger guard_profile_role_update)
    const { error: selfEscalateErr } = await devClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', devAuth.user!.id);
    expect(selfEscalateErr).not.toBeNull();

    // Admin 1-Click Demo account signs in and can query global profiles & runs
    const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
      email: 'admin@repomedic.dev',
      password: 'RepoMedicAdmin!2026',
    });
    expect(adminAuthErr).toBeNull();
    expect(adminAuth.user?.email).toBe('admin@repomedic.dev');

    const { data: isAdminRes, error: isAdminErr } = await adminClient.rpc('is_admin');
    expect(isAdminErr).toBeNull();
    expect(isAdminRes).toBe(true);

    const { data: allProfiles, error: allProfilesErr } = await adminClient
      .from('profiles')
      .select('id, email, role')
      .limit(10);
    expect(allProfilesErr).toBeNull();
    expect((allProfiles ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
