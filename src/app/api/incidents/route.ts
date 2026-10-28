import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import {
  getAllowedRepositories,
  isRepositoryAllowlisted,
  isSafeRepositoryFilePath,
  redactSecrets,
} from '@/lib/security/redact';

const CreateIncidentSchema = z.object({
  repositoryFullName: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .refine(isRepositoryAllowlisted, {
      message: 'Repository is not in the configured GITHUB_ALLOWED_REPOS allowlist.',
    }),
  baseSha: z
    .string()
    .trim()
    .min(7)
    .max(64)
    .regex(/^[a-fA-F0-9]{7,64}$/, 'Base SHA must be a valid hexadecimal commit hash.')
    .optional(),
  title: z.string().trim().min(5).max(240),
  errorText: z.string().trim().min(15).max(12000),
  affectedFileHint: z
    .string()
    .trim()
    .max(240)
    .optional()
    .refine((val) => !val || isSafeRepositoryFilePath(val), {
      message: 'Affected file hint must be a safe relative file path.',
    }),
});

const userIncidentsCache = new Map<
  string,
  { expiresAt: number; payload: { incidents: unknown[]; allowedRepositories: string[] } }
>();

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? (await supabase.auth.getUser()).data.user;

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Sign in required to list user incidents.');
  }

  const cached = userIncidentsCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  const { data: incidents, error } = await supabase
    .from('incidents')
    .select(
      'id, user_id, repository_full_name, base_sha, title, error_text_redacted, affected_file_hint, is_demo, created_at, runs(id, incident_id, status, attempt_count, model_id, input_tokens, output_tokens, started_at, finished_at, last_error, created_at)',
    )
    .eq('user_id', user.id)
    .eq('is_demo', false)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    return apiErrorResponse(500, 'DB_ERROR', error.message);
  }

  const payload = {
    incidents: incidents ?? [],
    allowedRepositories: getAllowedRepositories(),
  };
  userIncidentsCache.set(user.id, {
    expiresAt: Date.now() + 15_000,
    payload,
  });

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Authentication required to create an incident.');
  }

  const limit = enforceRateLimit(`incidents:${user.id}`, 15, 60_000);
  if (!limit.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Incident creation rate limit exceeded.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const parsed = CreateIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    );
  }

  const defaultSha =
    process.env.GITHUB_FIXTURE_BASE_SHA &&
    process.env.GITHUB_FIXTURE_BASE_SHA !== 'REPLACE_WITH_KNOWN_FAILING_SHA'
      ? process.env.GITHUB_FIXTURE_BASE_SHA
      : '440255c3e1efe73a24d2cd92b90055c54c3e3549';

  const redactedError = redactSecrets(parsed.data.errorText, 12000);

  const { data: incident, error } = await supabase
    .from('incidents')
    .insert({
      user_id: user.id,
      repository_full_name: parsed.data.repositoryFullName,
      base_sha: parsed.data.baseSha || defaultSha,
      title: redactSecrets(parsed.data.title, 240),
      error_text_redacted: redactedError,
      affected_file_hint: parsed.data.affectedFileHint || null,
      is_demo: false,
    })
    .select('*')
    .single();

  if (error || !incident) {
    return apiErrorResponse(500, 'DB_INSERT_ERROR', error?.message || 'Failed to create incident.');
  }

  userIncidentsCache.delete(user.id);
  return NextResponse.json({ incident }, { status: 201 });
}
