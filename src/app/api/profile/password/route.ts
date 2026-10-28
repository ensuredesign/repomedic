import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { sendPasswordChangedEmail } from '@/lib/email/resend';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().optional().nullable(),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long.')
    .max(128),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? (await supabase.auth.getUser()).data.user;
  if (!user || !user.email) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Sign in required to change your password.');
  }

  const rl = enforceRateLimit(`change_pwd:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Too many password update attempts. Please wait.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      parsed.error.issues.map((i) => i.message).join('; '),
    );
  }

  const { error: rpcError } = await supabase.rpc('change_own_password', {
    p_new_password: parsed.data.newPassword,
    p_current_password: parsed.data.currentPassword ? parsed.data.currentPassword : null,
  });

  if (rpcError) {
    return apiErrorResponse(400, 'PASSWORD_CHANGE_FAILED', rpcError.message);
  }

  const emailRes = await sendPasswordChangedEmail({
    toEmail: user.email,
    displayName:
      (user.user_metadata?.full_name as string | undefined) ||
      user.email.split('@')[0] ||
      'Engineer',
  });

  return NextResponse.json({
    ok: true,
    updated: true,
    emailSent: emailRes.sent,
    emailId: emailRes.emailId,
  });
}
