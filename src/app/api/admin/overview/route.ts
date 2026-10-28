import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { getResendConfig } from '@/lib/email/resend';
import { getAllowedRepositories } from '@/lib/security/redact';

const UpdateUserRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(['developer', 'admin']),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Sign in required to access Admin Panel.');
  }

  const [callerProfileRes, profilesRes, incidentsRes, runsRes, prsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('runs').select('*').order('created_at', { ascending: false }).limit(100),
    supabase
      .from('pull_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const callerProfile = callerProfileRes.data;
  if (!callerProfile || callerProfile.role !== 'admin') {
    return apiErrorResponse(
      403,
      'ADMIN_REQUIRED',
      'Administrator role is required to view platform governance & telemetry.',
    );
  }

  const profiles = profilesRes.data ?? [];
  const incidents = incidentsRes.data ?? [];
  const runs = runsRes.data ?? [];
  const pullRequests = prsRes.data ?? [];

  const verifiedRuns = runs.filter(
    (r) => r.status === 'verified' || r.status === 'draft_pr_created',
  );
  const failedOrUnverifiedRuns = runs.filter(
    (r) => r.status === 'failed' || r.status === 'unverified',
  );
  const totalInputTokens = runs.reduce((acc, r) => acc + (Number(r.input_tokens) || 0), 0);
  const totalOutputTokens = runs.reduce((acc, r) => acc + (Number(r.output_tokens) || 0), 0);
  const totalEstimatedCostUsd = runs.reduce(
    (acc, r) => acc + (Number(r.estimated_cost_usd) || 0),
    0,
  );

  // Map incident titles and user emails onto runs for admin table inspection
  const incidentById = new Map(incidents.map((inc) => [inc.id, inc]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const prByRunId = new Map(pullRequests.map((pr) => [pr.run_id, pr]));

  const enrichedRuns = runs.slice(0, 30).map((r) => {
    const inc = incidentById.get(r.incident_id);
    const owner = profileById.get(r.user_id);
    const pr = prByRunId.get(r.id);
    return {
      ...r,
      incidentTitle: inc?.title ?? 'Untitled Incident',
      repositoryFullName: inc?.repository_full_name ?? 'ensuredesign/repomedic-fixture',
      baseSha: inc?.base_sha ?? '',
      ownerEmail: owner?.email ?? (r.is_demo ? 'system@repomedic.dev' : 'developer@repomedic.dev'),
      ownerName: owner?.display_name ?? (r.is_demo ? 'Curated Case Study' : 'Developer'),
      pullRequestUrl: pr?.github_pr_url ?? null,
      pullRequestNumber: pr?.github_pr_number ?? null,
    };
  });

  const resendConfig = getResendConfig();

  return NextResponse.json({
    callerProfile,
    kpis: {
      totalUsers: profiles.length,
      adminCount: profiles.filter((p) => p.role === 'admin').length,
      totalIncidents: incidents.length,
      totalRuns: runs.length,
      verifiedRunsCount: verifiedRuns.length,
      failedOrUnverifiedCount: failedOrUnverifiedRuns.length,
      draftPrsCount: pullRequests.length,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(6)),
    },
    integrations: {
      nebiusModel: process.env.NEBIUS_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
      nebiusConfigured: Boolean(process.env.NEBIUS_API_KEY),
      vercelSandboxConfigured: Boolean(process.env.VERCEL_TOKEN || process.env.VERCEL_OIDC_TOKEN),
      githubConfigured: Boolean(process.env.GITHUB_TOKEN),
      allowedRepositories: getAllowedRepositories(),
      resendConfigured: resendConfig.configured,
      resendFromEmail: resendConfig.fromEmail,
    },
    users: profiles,
    runs: enrichedRuns,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Sign in required.');
  }

  const rl = enforceRateLimit(`admin_role_change:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Too many admin role updates.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = UpdateUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      parsed.error.issues.map((i) => i.message).join('; '),
    );
  }

  const { data: updatedProfile, error: rpcError } = await supabase.rpc('admin_set_user_role', {
    p_target_user_id: parsed.data.targetUserId,
    p_new_role: parsed.data.role,
  });

  if (rpcError) {
    return apiErrorResponse(403, 'ROLE_UPDATE_DENIED', rpcError.message);
  }

  return NextResponse.json({
    ok: true,
    profile: updatedProfile,
  });
}
