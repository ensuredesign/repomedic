import crypto from 'crypto';
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
        repository_full_name: 'ensuredesign/repomedic-fixture',
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

  it('4. verifies full Registration -> Profile Update -> Change Password -> Forgot Password Reset & Separate Account Isolation', async () => {
    const userClient = makeAnonClient();
    const otherClient = makeAnonClient();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const regEmail = `reg-user-${suffix}@repomedic.local`;
    const initialPassword = 'InitialPass!2026';
    const rotatedPassword = 'RotatedPass!2026';
    const recoveredPassword = 'RecoveredPass!2026';

    // 1. Register new user with profile metadata
    const { data: signUpData, error: signUpErr } = await userClient.auth.signUp({
      email: regEmail,
      password: initialPassword,
      options: {
        data: {
          full_name: 'Dr. Kavya Nair',
          organization: 'Quantum SRE Labs',
          job_title: 'Lead Reliability Architect',
          github_username: 'ensuredesign',
        },
      },
    });
    expect(signUpErr).toBeNull();
    expect(signUpData.user?.id).toBeTruthy();

    if (!signUpData.session) {
      const { error: loginErr } = await userClient.auth.signInWithPassword({
        email: regEmail,
        password: initialPassword,
      });
      expect(loginErr).toBeNull();
    }

    const userId = signUpData.user!.id;

    // Verify isolated profile row was automatically provisioned
    const { data: myProfile, error: profErr } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    expect(profErr).toBeNull();
    expect(myProfile?.email).toBe(regEmail);
    expect(myProfile?.display_name).toBe('Dr. Kavya Nair');
    expect(myProfile?.organization).toBe('Quantum SRE Labs');

    // 2. Update profile fields and verify persistence in user's isolated account
    const { data: updatedProfile, error: updErr } = await userClient
      .from('profiles')
      .update({
        display_name: 'Kavya Nair, PhD',
        organization: 'Nebius Cloud SRE',
        job_title: 'VP of Autonomous Systems',
        bio: 'Testing isolated user account storage.',
      })
      .eq('id', userId)
      .select('*')
      .single();
    expect(updErr).toBeNull();
    expect(updatedProfile?.display_name).toBe('Kavya Nair, PhD');
    expect(updatedProfile?.organization).toBe('Nebius Cloud SRE');

    // Verify another user (judge@repomedic.dev) cannot read or modify this user's profile
    await otherClient.auth.signInWithPassword({
      email: 'judge@repomedic.dev',
      password: 'RepoMedicJudge!2026',
    });
    const { data: otherRead } = await otherClient
      .from('profiles')
      .select('*')
      .eq('id', userId);
    expect(otherRead).toEqual([]);

    // 3. Change password via authenticated RPC (change_own_password)
    const { data: changeRes, error: changeErr } = await userClient.rpc('change_own_password', {
      p_new_password: rotatedPassword,
      p_current_password: initialPassword,
    });
    expect(changeErr).toBeNull();
    expect((changeRes as { updated?: boolean })?.updated).toBe(true);

    // Verify old password fails and rotated password succeeds
    const verifyClient1 = makeAnonClient();
    const { error: oldLoginErr } = await verifyClient1.auth.signInWithPassword({
      email: regEmail,
      password: initialPassword,
    });
    expect(oldLoginErr).not.toBeNull();

    const { error: rotatedLoginErr } = await verifyClient1.auth.signInWithPassword({
      email: regEmail,
      password: rotatedPassword,
    });
    expect(rotatedLoginErr).toBeNull();

    // 4. Forgot Password flow: request 6-digit recovery code -> consume -> sign in with recovered password
    const resetCode = '849204';
    const tokenHash = crypto.createHash('sha256').update(resetCode).digest('hex');

    const anonResetClient = makeAnonClient();
    const { data: reqTokenRes, error: reqTokenErr } = await anonResetClient.rpc(
      'request_password_reset_token',
      {
        p_email: regEmail,
        p_token_hash: tokenHash,
      },
    );
    expect(reqTokenErr).toBeNull();
    expect((reqTokenRes as { found?: boolean })?.found).toBe(true);

    const { data: consumeRes, error: consumeErr } = await anonResetClient.rpc(
      'consume_password_reset_token',
      {
        p_email: regEmail,
        p_token_hash: tokenHash,
        p_new_password: recoveredPassword,
      },
    );
    expect(consumeErr).toBeNull();
    expect((consumeRes as { reset?: boolean })?.reset).toBe(true);

    // Replaying the same recovery code must fail
    const { error: replayErr } = await anonResetClient.rpc('consume_password_reset_token', {
      p_email: regEmail,
      p_token_hash: tokenHash,
      p_new_password: 'AnotherPassword!2026',
    });
    expect(replayErr).not.toBeNull();

    // Sign in with recovered password
    const finalClient = makeAnonClient();
    const { data: finalAuth, error: finalLoginErr } = await finalClient.auth.signInWithPassword({
      email: regEmail,
      password: recoveredPassword,
    });
    expect(finalLoginErr).toBeNull();
    expect(finalAuth.user?.id).toBe(userId);
  });
});
