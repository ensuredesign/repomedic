import { redactSecrets } from '@/lib/security/redact';

export const DEFAULT_RESEND_FROM_EMAIL = 'RepoMedic <info@ensure.in>';

export interface ResendConfig {
  configured: boolean;
  apiKey: string | null;
  fromEmail: string;
}

export function getResendConfig(): ResendConfig {
  const rawKey = process.env.RESEND_API_KEY?.trim() || '';
  const apiKey =
    rawKey.length > 0 &&
    rawKey !== 'REPLACE_IF_USING_RESEND' &&
    rawKey !== 'REPLACE_ME'
      ? rawKey
      : null;

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim().replace(/^"|"$/g, '') ||
    DEFAULT_RESEND_FROM_EMAIL;

  return {
    configured: Boolean(apiKey),
    apiKey,
    fromEmail,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SendProofOfFixEmailParams {
  toEmail: string;
  runId: string;
  incidentTitle: string;
  repositoryFullName: string;
  baseSha: string;
  modelId: string;
  rootCause: string;
  rationale: string;
  diffSha256: string;
  unifiedDiff: string;
  baselineSummary: string;
  candidateSummary: string;
  draftPrUrl?: string | null;
  draftPrNumber?: number | null;
}

export interface SendProofOfFixEmailResult {
  sent: boolean;
  emailId: string | null;
  fromEmail: string;
  toEmail: string;
  error: string | null;
}

export async function sendProofOfFixNotificationEmail(
  params: SendProofOfFixEmailParams,
): Promise<SendProofOfFixEmailResult> {
  const cfg = getResendConfig();
  if (!cfg.apiKey) {
    return {
      sent: false,
      emailId: null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: 'RESEND_API_KEY is not configured on the server.',
    };
  }

  const subject = params.draftPrNumber
    ? `[RepoMedic Verified] Draft PR #${params.draftPrNumber} — ${params.incidentTitle.slice(0, 72)}`
    : `[RepoMedic Proof-of-Fix] Verified Patch — ${params.incidentTitle.slice(0, 72)}`;

  const safeDiff = escapeHtml(redactSecrets(params.unifiedDiff, 4000));
  const safeRootCause = escapeHtml(redactSecrets(params.rootCause, 1500));
  const safeRationale = escapeHtml(redactSecrets(params.rationale, 1000));

  const prSectionHtml = params.draftPrUrl
    ? `<div style="margin-top:20px;padding:16px;border-radius:8px;background:#ECFDF5;border:1px solid #10B981;">
        <div style="font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:0.04em;">Approval-Gated GitHub Draft Pull Request</div>
        <div style="margin-top:6px;font-size:14px;color:#0A0A0A;">
          Draft PR <strong>#${params.draftPrNumber ?? ''}</strong> is ready for human code review:
          <a href="${escapeHtml(params.draftPrUrl)}" style="color:#4F46E5;font-weight:600;text-decoration:underline;">${escapeHtml(params.draftPrUrl)}</a>
        </div>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0A0A0A;">
  <div style="max-width:680px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E8EC;border-radius:12px;overflow:hidden;">
    <div style="padding:20px 24px;background:#FAFAFA;border-bottom:1px solid #E8E8EC;">
      <div style="font-size:11px;font-family:monospace;color:#6366F1;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
        RepoMedic · Diagnose. Patch. Prove.
      </div>
      <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;color:#0A0A0A;">
        ${escapeHtml(params.incidentTitle)}
      </h1>
      <div style="margin-top:6px;font-size:12px;font-family:monospace;color:#52525B;">
        Repo: ${escapeHtml(params.repositoryFullName)} @ ${escapeHtml(params.baseSha.slice(0, 12))} · Run ID: ${escapeHtml(params.runId.slice(0, 8))}
      </div>
    </div>

    <div style="padding:24px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:240px;padding:12px 14px;border-radius:8px;background:#FEF2F2;border:1px solid #FECACA;">
          <div style="font-size:11px;font-family:monospace;font-weight:700;color:#B91C1C;">1. BASELINE CHECK (UNMODIFIED SHA)</div>
          <div style="margin-top:4px;font-size:13px;font-family:monospace;color:#0A0A0A;">${escapeHtml(params.baselineSummary)}</div>
        </div>
        <div style="flex:1;min-width:240px;padding:12px 14px;border-radius:8px;background:#ECFDF5;border:1px solid #A7F3D0;">
          <div style="font-size:11px;font-family:monospace;font-weight:700;color:#047857;">2. POST-PATCH CHECK (VERCEL SANDBOX)</div>
          <div style="margin-top:4px;font-size:13px;font-family:monospace;color:#0A0A0A;">${escapeHtml(params.candidateSummary)}</div>
        </div>
      </div>

      <h2 style="margin:0 0 8px;font-size:15px;color:#0A0A0A;">Root-Cause Diagnosis (${escapeHtml(params.modelId)})</h2>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#27272A;">${safeRootCause}</p>

      <h2 style="margin:0 0 6px;font-size:15px;color:#0A0A0A;">Verified Minimal Patch</h2>
      <p style="margin:0 0 8px;font-size:13px;color:#52525B;">${safeRationale}</p>
      <div style="margin-bottom:8px;font-size:11px;font-family:monospace;color:#52525B;">
        SHA-256 Diff Fingerprint: <strong>${escapeHtml(params.diffSha256)}</strong>
      </div>
      <pre style="margin:0;padding:14px;border-radius:8px;background:#FAFAFA;border:1px solid #E8E8EC;font-family:monospace;font-size:12px;line-height:1.5;overflow-x:auto;color:#0A0A0A;">${safeDiff}</pre>

      ${prSectionHtml}
    </div>

    <div style="padding:14px 24px;background:#FAFAFA;border-top:1px solid #E8E8EC;font-size:12px;color:#52525B;">
      Sent via Resend by RepoMedic (<a href="https://repomedic-eta.vercel.app" style="color:#4F46E5;text-decoration:none;">repomedic-eta.vercel.app</a>) · Opt-in verification report.
    </div>
  </div>
</body>
</html>`;

  const text = [
    `RepoMedic Proof-of-Fix Report — ${params.incidentTitle}`,
    `Repository: ${params.repositoryFullName} @ ${params.baseSha}`,
    `Run ID: ${params.runId}`,
    `Model: ${params.modelId}`,
    '',
    `Baseline Check: ${params.baselineSummary}`,
    `Post-Patch Check: ${params.candidateSummary}`,
    '',
    `Root Cause:\n${redactSecrets(params.rootCause, 1500)}`,
    '',
    `Patch Rationale (${params.diffSha256}):\n${redactSecrets(params.rationale, 1000)}`,
    '',
    `Unified Diff:\n${redactSecrets(params.unifiedDiff, 4000)}`,
    params.draftPrUrl ? `\nDraft Pull Request: ${params.draftPrUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.fromEmail,
        to: [params.toEmail],
        subject,
        html,
        text,
      }),
    });

    const data = (await res.json()) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      return {
        sent: false,
        emailId: null,
        fromEmail: cfg.fromEmail,
        toEmail: params.toEmail,
        error: redactSecrets(data?.message || `Resend returned HTTP ${res.status}`, 300),
      };
    }

    return {
      sent: true,
      emailId: data.id ?? null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: null,
    };
  } catch (err) {
    return {
      sent: false,
      emailId: null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: redactSecrets(err instanceof Error ? err.message : String(err), 300),
    };
  }
}

export interface SendWelcomeEmailParams {
  toEmail: string;
  displayName: string;
  organization: string;
  jobTitle: string;
  role?: string;
}

export async function sendWelcomeRegistrationEmail(
  params: SendWelcomeEmailParams,
): Promise<SendProofOfFixEmailResult> {
  const cfg = getResendConfig();
  if (!cfg.apiKey) {
    return {
      sent: false,
      emailId: null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: 'RESEND_API_KEY is not configured on the server.',
    };
  }

  const subject = `Welcome to RepoMedic, ${params.displayName} — Your Isolated AI SRE Workspace is Ready`;
  const safeName = escapeHtml(params.displayName || 'Engineer');
  const safeOrg = escapeHtml(params.organization || 'RepoMedic Engineering');
  const safeTitle = escapeHtml(params.jobTitle || 'Software Engineer');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1D1D1F;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:18px;overflow:hidden;">
    <div style="padding:24px 28px;background:#1D1D1F;color:#F5F5F7;">
      <div style="font-size:11px;font-family:monospace;color:#64D2FF;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
        RepoMedic · Diagnose. Patch. Prove.
      </div>
      <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;color:#FFFFFF;">
        Welcome to RepoMedic, ${safeName}
      </h1>
      <div style="margin-top:6px;font-size:13px;color:#A1A1A6;">
        Nebius Token Factory × NVIDIA Nemotron · Isolated Vercel Sandbox Verification
      </div>
    </div>

    <div style="padding:28px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1D1D1F;">
        Your developer account (<strong style="font-family:monospace;">${escapeHtml(params.toEmail)}</strong>) has been provisioned with dedicated PostgreSQL Row-Level Security (RLS) isolation. All incidents, diagnostic runs, patches, and draft pull request approvals are stored privately in your own account.
      </p>

      <div style="padding:16px 18px;border-radius:12px;background:#F5F5F7;border:1px solid #E5E5EA;margin-bottom:20px;">
        <div style="font-size:11px;font-family:monospace;font-weight:700;color:#0071E3;text-transform:uppercase;letter-spacing:0.06em;">
          Account &amp; Workspace Profile
        </div>
        <div style="margin-top:8px;font-size:13px;line-height:1.7;color:#1D1D1F;">
          <div><strong>Name:</strong> ${safeName}</div>
          <div><strong>Organization:</strong> ${safeOrg}</div>
          <div><strong>Role / Title:</strong> ${safeTitle}</div>
          <div><strong>Data Isolation:</strong> Dedicated User Partition (<code style="font-family:monospace;">auth.uid() = user_id</code>)</div>
        </div>
      </div>

      <div style="margin-top:22px;">
        <a href="https://repomedic-eta.vercel.app/app" style="display:inline-block;padding:12px 22px;border-radius:980px;background:#0071E3;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;margin-right:10px;">
          Open Incident Dashboard
        </a>
        <a href="https://repomedic-eta.vercel.app/app/profile" style="display:inline-block;padding:12px 22px;border-radius:980px;background:#F5F5F7;border:1px solid #D2D2D7;color:#1D1D1F;font-size:14px;font-weight:600;text-decoration:none;">
          Manage Profile &amp; Password
        </a>
      </div>
    </div>

    <div style="padding:14px 28px;background:#F5F5F7;border-top:1px solid #E5E5EA;font-size:12px;color:#515154;">
      Sent via Resend by RepoMedic (<a href="https://repomedic-eta.vercel.app" style="color:#0071E3;text-decoration:none;">repomedic-eta.vercel.app</a>)
    </div>
  </div>
</body>
</html>`;

  const text = [
    `Welcome to RepoMedic, ${params.displayName}!`,
    `Your account (${params.toEmail}) has been created with isolated PostgreSQL Row-Level Security (RLS).`,
    `Organization: ${params.organization}`,
    `Role / Title: ${params.jobTitle}`,
    '',
    `Open Incident Dashboard: https://repomedic-eta.vercel.app/app`,
    `Manage Profile & Password: https://repomedic-eta.vercel.app/app/profile`,
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.fromEmail,
        to: [params.toEmail],
        subject,
        html,
        text,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      return {
        sent: false,
        emailId: null,
        fromEmail: cfg.fromEmail,
        toEmail: params.toEmail,
        error: redactSecrets(data?.message || `Resend returned HTTP ${res.status}`, 300),
      };
    }
    return {
      sent: true,
      emailId: data.id ?? null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: null,
    };
  } catch (err) {
    return {
      sent: false,
      emailId: null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: redactSecrets(err instanceof Error ? err.message : String(err), 300),
    };
  }
}

export interface SendPasswordResetEmailParams {
  toEmail: string;
  displayName: string;
  resetCode: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams,
): Promise<SendProofOfFixEmailResult> {
  const cfg = getResendConfig();
  if (!cfg.apiKey) {
    return {
      sent: false,
      emailId: null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: 'RESEND_API_KEY is not configured on the server.',
    };
  }

  const expires = params.expiresInMinutes ?? 30;
  const subject = `[RepoMedic Security] Password Reset Code: ${params.resetCode}`;
  const safeName = escapeHtml(params.displayName || 'Engineer');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1D1D1F;">
  <div style="max-width:620px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:18px;overflow:hidden;">
    <div style="padding:22px 28px;background:#1D1D1F;color:#F5F5F7;">
      <div style="font-size:11px;font-family:monospace;color:#64D2FF;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
        RepoMedic Account Security
      </div>
      <h1 style="margin:8px 0 0;font-size:20px;color:#FFFFFF;">
        Reset Your RepoMedic Password
      </h1>
    </div>

    <div style="padding:28px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1D1D1F;">
        Hi ${safeName}, we received a request to reset the password for <strong style="font-family:monospace;">${escapeHtml(params.toEmail)}</strong>. Enter the 6-digit recovery code below or click the button to set a new password:
      </p>

      <div style="padding:18px;border-radius:14px;background:#F5F5F7;border:1px solid #D2D2D7;text-align:center;margin:20px 0;">
        <div style="font-size:11px;font-family:monospace;color:#515154;text-transform:uppercase;letter-spacing:0.08em;">
          6-Digit Security Recovery Code (Valid ${expires} Mins)
        </div>
        <div style="margin-top:8px;font-size:30px;font-family:monospace;font-weight:800;letter-spacing:0.22em;color:#0071E3;">
          ${escapeHtml(params.resetCode)}
        </div>
      </div>

      <div style="margin:22px 0;">
        <a href="${escapeHtml(params.resetUrl)}" style="display:inline-block;padding:12px 24px;border-radius:980px;background:#0071E3;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">
          Reset Password in 1 Click
        </a>
      </div>

      <p style="margin:16px 0 0;font-size:12px;color:#515154;line-height:1.5;">
        If you did not request a password reset, you can safely ignore this email. Your existing password remains unchanged.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `RepoMedic Password Reset Request`,
    `Hi ${params.displayName},`,
    `Use this 6-digit recovery code to reset your password (valid for ${expires} minutes): ${params.resetCode}`,
    `Or open this link: ${params.resetUrl}`,
  ].join('\n\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.fromEmail,
        to: [params.toEmail],
        subject,
        html,
        text,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      return {
        sent: false,
        emailId: null,
        fromEmail: cfg.fromEmail,
        toEmail: params.toEmail,
        error: redactSecrets(data?.message || `Resend returned HTTP ${res.status}`, 300),
      };
    }
    return {
      sent: true,
      emailId: data.id ?? null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: null,
    };
  } catch (err) {
    return {
      sent: false,
      emailId: null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: redactSecrets(err instanceof Error ? err.message : String(err), 300),
    };
  }
}

export async function sendPasswordChangedEmail(params: {
  toEmail: string;
  displayName: string;
}): Promise<SendProofOfFixEmailResult> {
  const cfg = getResendConfig();
  if (!cfg.apiKey) {
    return {
      sent: false,
      emailId: null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: 'RESEND_API_KEY is not configured on the server.',
    };
  }

  const subject = `[RepoMedic Security] Your account password was updated`;
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background-color:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1D1D1F;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:16px;padding:24px;">
    <div style="font-size:11px;font-family:monospace;color:#047857;font-weight:700;text-transform:uppercase;">
      RepoMedic Security Confirmation
    </div>
    <h2 style="margin:8px 0 12px;font-size:19px;color:#1D1D1F;">Password Updated Successfully</h2>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#515154;">
      Hi ${escapeHtml(params.displayName || 'Engineer')}, the password for your RepoMedic account (<strong>${escapeHtml(params.toEmail)}</strong>) was just updated.
    </p>
  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.fromEmail,
        to: [params.toEmail],
        subject,
        html,
        text: `Hi ${params.displayName}, the password for your RepoMedic account (${params.toEmail}) was just updated.`,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    return {
      sent: res.ok,
      emailId: data.id ?? null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: res.ok ? null : redactSecrets(data?.message || `HTTP ${res.status}`, 300),
    };
  } catch (err) {
    return {
      sent: false,
      emailId: null,
      fromEmail: cfg.fromEmail,
      toEmail: params.toEmail,
      error: redactSecrets(err instanceof Error ? err.message : String(err), 300),
    };
  }
}
