import { NextResponse } from 'next/server';
import {
  runNebiusSmokeTest,
  verifyNebiusModelCatalog,
} from '@/lib/ai/nebius';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { redactSecrets } from '@/lib/security/redact';

export async function GET() {
  const catalog = await verifyNebiusModelCatalog();
  if (!catalog.configured) {
    return NextResponse.json(
      {
        status: 'blocked_missing_key',
        catalog,
        inference: null,
        message:
          'NEBIUS_API_KEY is not configured in server environment. Supply NEBIUS_API_KEY to enable live NVIDIA Nemotron inference.',
      },
      { status: 503 },
    );
  }

  if (!catalog.reachable || !catalog.resolvedNvidiaModel) {
    return NextResponse.json(
      {
        status: 'catalog_error',
        catalog,
        inference: null,
      },
      { status: 502 },
    );
  }

  try {
    const smoke = await runNebiusSmokeTest();
    return NextResponse.json({
      status: 'ok',
      catalog,
      inference: {
        modelId: smoke.modelId,
        requestId: smoke.requestId,
        latencyMs: smoke.latencyMs,
        inputTokens: smoke.inputTokens,
        outputTokens: smoke.outputTokens,
        validatedPayload: smoke.data,
      },
    });
  } catch (err) {
    return apiErrorResponse(
      502,
      'NEBIUS_INFERENCE_FAILED',
      redactSecrets(err instanceof Error ? err.message : String(err), 400),
    );
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local';
  const limit = enforceRateLimit(`ai-health:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Too many AI health checks. Please wait 60 seconds.');
  }
  return GET();
}
