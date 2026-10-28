import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAnonServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { sendPasswordResetEmail } from '@/lib/email/resend';

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.').max(160),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = ForgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      parsed.error.issues.map((i) => i.message).join('; '),
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  const rl = enforceRateLimit(`forgot_pwd:${normalizedEmail}`, 6, 60_000);
  if (!rl.allowed) {
    return apiErrorResponse(
      429,
      'RATE_LIMITED',
      'Too many password reset requests for this email. Please wait a minute.',
    );
  }

  // Generate 6-digit recovery code and SHA-256 hash
  const resetCode = crypto.randomInt(100000, 999999).toString();
  const tokenHash = crypto.createHash('sha256').update(resetCode).digest('hex');

  const supabase = createSupabaseAnonServerClient();
  const { data: rpcResult, error: rpcError } = await supabase.rpc('request_password_reset_token', {
    p_email: normalizedEmail,
    p_token_hash: tokenHash,
  });

  if (rpcError) {
    return apiErrorResponse(500, 'RESET_TOKEN_ERROR', rpcError.message);
  }

  const resultObj = (rpcResult ?? {}) as {
    found?: boolean;
    email?: string;
    display_name?: string | null;
  };

  if (!resultObj.found) {
    return apiErrorResponse(
      404,
      'ACCOUNT_NOT_FOUND',
      'No registered RepoMedic account was found with that email address.',
    );
  }

  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://repomedic-eta.vercel.app';

  const resetUrl = `${origin}/auth?mode=reset&email=${encodeURIComponent(normalizedEmail)}&code=${encodeURIComponent(resetCode)}`;

  const emailRes = await sendPasswordResetEmail({
    toEmail: normalizedEmail,
    displayName: resultObj.display_name || normalizedEmail.split('@')[0] || 'Engineer',
    resetCode,
    resetUrl,
    expiresInMinutes: 30,
  });

  return NextResponse.json({
    ok: true,
    emailSent: emailRes.sent,
    emailId: emailRes.emailId,
    fromEmail: emailRes.fromEmail,
    toEmail: normalizedEmail,
    expiresInMinutes: 30,
    error: emailRes.error,
    message: emailRes.sent
      ? `Password reset email with a 6-digit recovery code has been sent to ${normalizedEmail} via Resend (${emailRes.fromEmail}).`
      : `Password reset token generated for ${normalizedEmail}, but email delivery reported: ${emailRes.error ?? 'Check Resend configuration'}`,
  });
}
