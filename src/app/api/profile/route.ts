import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import type { ProfileRow } from '@/lib/supabase/types';

const UpdateProfileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  organization: z.string().trim().min(2).max(100),
  job_title: z.string().trim().min(2).max(100),
  github_username: z.string().trim().max(60).optional().nullable(),
  notification_email: z.string().trim().email().max(160).optional().nullable().or(z.literal('')),
  bio: z.string().trim().max(400).optional().nullable(),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? (await supabase.auth.getUser()).data.user;

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Sign in required to view profile.');
  }

  const [existingProfileRes, incidentsRes, runsRes, prsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('runs')
      .select('id, status, input_tokens, output_tokens, estimated_cost_usd')
      .eq('user_id', user.id),
    supabase
      .from('pull_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  let profile = (existingProfileRes.data as ProfileRow | null) ?? null;

  if (!profile) {
    const defaultRole = user.email?.toLowerCase() === 'admin@repomedic.dev' ? 'admin' : 'developer';
    const { data: inserted } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email ?? null,
        display_name:
          (user.user_metadata?.full_name as string | undefined) ||
          user.email?.split('@')[0] ||
          'Developer',
        role: defaultRole,
        organization:
          (user.user_metadata?.organization as string | undefined) || 'RepoMedic Engineering',
        job_title: (user.user_metadata?.job_title as string | undefined) || 'Software Engineer',
        github_username: (user.user_metadata?.github_username as string | undefined) || null,
        notification_email: user.email ?? null,
      })
      .select('*')
      .single();
    profile = inserted as ProfileRow | null;
  }

  const userRuns = runsRes.data ?? [];
  const verifiedRunsCount = userRuns.filter(
    (r) => r.status === 'verified' || r.status === 'draft_pr_created',
  ).length;
  const totalTokens = userRuns.reduce(
    (sum, r) => sum + (Number(r.input_tokens) || 0) + (Number(r.output_tokens) || 0),
    0,
  );

  return NextResponse.json({
    profile,
    stats: {
      totalIncidents: incidentsRes.count ?? 0,
      totalRuns: userRuns.length,
      verifiedRuns: verifiedRunsCount,
      draftPrsCreated: prsRes.count ?? 0,
      totalNemotronTokens: totalTokens,
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Sign in required to update profile.');
  }

  const rl = enforceRateLimit(`profile_update:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Too many profile updates. Please wait.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      parsed.error.issues.map((i) => i.message).join('; '),
    );
  }

  const payload = parsed.data;
  const { data: updated, error: updateErr } = await supabase
    .from('profiles')
    .update({
      display_name: payload.display_name,
      organization: payload.organization,
      job_title: payload.job_title,
      github_username: payload.github_username || null,
      notification_email: payload.notification_email || user.email || null,
      bio: payload.bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('*')
    .single();

  if (updateErr) {
    return apiErrorResponse(500, 'PROFILE_UPDATE_FAILED', updateErr.message);
  }

  return NextResponse.json({
    ok: true,
    profile: updated,
  });
}
