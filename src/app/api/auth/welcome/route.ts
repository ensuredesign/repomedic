import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { sendWelcomeRegistrationEmail } from '@/lib/email/resend';

const WelcomeRequestSchema = z
  .object({
    displayName: z.string().trim().max(80).optional(),
    organization: z.string().trim().max(100).optional(),
    jobTitle: z.string().trim().max(100).optional(),
    githubUsername: z.string().trim().max(60).optional().nullable(),
  })
  .optional();

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? (await supabase.auth.getUser()).data.user;
  if (!user || !user.email) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Authenticated user session required.');
  }

  const rl = enforceRateLimit(`welcome_email:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Too many welcome email requests. Please wait.');
  }

  let parsedBody: z.infer<typeof WelcomeRequestSchema> = undefined;
  try {
    const raw = await request.json();
    const parsed = WelcomeRequestSchema.safeParse(raw);
    if (parsed.success) {
      parsedBody = parsed.data;
    }
  } catch {
    // Empty body is valid
  }

  const displayName =
    parsedBody?.displayName ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email.split('@')[0] ||
    'Developer';
  const organization =
    parsedBody?.organization ||
    (user.user_metadata?.organization as string | undefined) ||
    'RepoMedic Engineering';
  const jobTitle =
    parsedBody?.jobTitle ||
    (user.user_metadata?.job_title as string | undefined) ||
    'Software Engineer';
  const githubUsername =
    parsedBody?.githubUsername ??
    (user.user_metadata?.github_username as string | undefined) ??
    null;

  const defaultRole = user.email.toLowerCase() === 'admin@repomedic.dev' ? 'admin' : 'developer';

  // Ensure isolated profile row exists and is up to date for this account
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      display_name: displayName,
      role: defaultRole,
      organization,
      job_title: jobTitle,
      github_username: githubUsername,
      notification_email: user.email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  const emailRes = await sendWelcomeRegistrationEmail({
    toEmail: user.email,
    displayName,
    organization,
    jobTitle,
    role: defaultRole,
  });

  if (emailRes.sent) {
    await supabase
      .from('profiles')
      .update({
        welcome_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  }

  return NextResponse.json({
    ok: true,
    emailSent: emailRes.sent,
    emailId: emailRes.emailId,
    fromEmail: emailRes.fromEmail,
    toEmail: emailRes.toEmail,
    error: emailRes.error,
  });
}
