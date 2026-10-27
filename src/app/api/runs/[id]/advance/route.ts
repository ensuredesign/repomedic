import { NextResponse } from 'next/server';
import { advanceRunStage } from '@/lib/agent/orchestrator';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiErrorResponse(401, 'UNAUTHORIZED', 'Authentication required to advance run stage.');
  }

  const limit = enforceRateLimit(`advance:${user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Stage advancement rate limit exceeded.');
  }

  try {
    const result = await advanceRunStage({
      supabase,
      runId: id,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(
      400,
      'ADVANCE_ERROR',
      err instanceof Error ? err.message : 'Failed to advance run stage.',
    );
  }
}
