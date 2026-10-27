import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60_000,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

export function apiErrorResponse(
  status: number,
  code: string,
  message: string,
  requestId = randomUUID(),
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    { status },
  );
}
