import { NextResponse } from 'next/server';
import { createSupabaseAnonServerClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/security/api-guard';

let cachedDemoPayload: {
  timestamp: number;
  body: Record<string, unknown>;
} | null = null;

const DEMO_CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  if (cachedDemoPayload && Date.now() - cachedDemoPayload.timestamp < DEMO_CACHE_TTL_MS) {
    return NextResponse.json(cachedDemoPayload.body, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }

  const supabase = createSupabaseAnonServerClient();

  const [incidentsRes, runsRes] = await Promise.all([
    supabase
      .from('incidents')
      .select('*')
      .eq('is_demo', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('runs')
      .select('*')
      .eq('is_demo', true)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const incident = incidentsRes.data?.[0];
  const run = runsRes.data?.[0];

  if (incidentsRes.error || !incident || runsRes.error || !run) {
    return apiErrorResponse(404, 'DEMO_NOT_FOUND', 'Recorded demo case study not found.');
  }

  const [eventsRes, patchesRes, testsRes] = await Promise.all([
    supabase
      .from('run_events')
      .select('*')
      .eq('run_id', run.id)
      .eq('is_demo', true)
      .order('seq', { ascending: true }),
    supabase
      .from('patches')
      .select('*')
      .eq('run_id', run.id)
      .eq('is_demo', true)
      .order('attempt_number', { ascending: true }),
    supabase
      .from('test_results')
      .select('*')
      .eq('run_id', run.id)
      .eq('is_demo', true)
      .order('created_at', { ascending: true }),
  ]);

  const body = {
    provenance: 'recorded_case_study',
    disclaimer:
      'This is a curated read-only recorded case study persisted with is_demo=true for instant judge inspection. Sign in to run a live investigation.',
    bundle: {
      incident,
      run,
      events: eventsRes.data ?? [],
      patches: patchesRes.data ?? [],
      testResults: testsRes.data ?? [],
      approvals: [],
      pullRequest: null,
    },
  };

  cachedDemoPayload = {
    timestamp: Date.now(),
    body,
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
