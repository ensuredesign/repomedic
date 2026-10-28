import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAnonServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { sendPasswordChangedEmail } from '@/lib/email/resend';

const ResetPasswordSchema = z.object({
  email: z.string().trim().email('Valid email address is required.').max(160),
  code: z
    .string()
    .trim()
    .min(6, 'Enter the 6-digit recovery code from your email.')
    .max(64),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long.')
    .max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = ResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      parsed.error.issues.map((i) => i.message).join('; '),
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const rl = enforceRateLimit(`reset_pwd_consume:${normalizedEmail}`, 10, 60_000);
  if (!rl.allowed) {
    return apiErrorResponse(
      429,
      'RATE_LIMITED',
      'Too many password reset attempts. Please wait a minute.',
    );
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(parsed.data.code.trim())
    .digest('hex');

  const supabase = createSupabaseAnonServerClient();
  const { data: rpcData, error: rpcError } = await supabase.rpc('consume_password_reset_token', {
    p_email: normalizedEmail,
    p_token_hash: tokenHash,
    p_new_password: parsed.data.newPassword,
  });

  if (rpcError) {
    return apiErrorResponse(400, 'INVALID_OR_EXPIRED_CODE', rpcError.message);
  }

  const emailRes = await sendPasswordChangedEmail({
    toEmail: normalizedEmail,
    displayName: normalizedEmail.split('@')[0] || 'Engineer',
  });

  return NextResponse.json({
    ok: true,
    reset: true,
    email: (rpcData as { email?: string } | null)?.email ?? normalizedEmail,
    confirmationEmailSent: emailRes.sent,
    confirmationEmailId: emailRes.emailId,
  });
}
