import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recallRepositoryEpisodicMemory } from '@/lib/agent/memory';
import { runIncidentCopilotWithNemotron } from '@/lib/ai/nebius';
import { searchIncidentIntelligenceWithTavily } from '@/lib/ai/tavily';
import { apiErrorResponse, enforceRateLimit } from '@/lib/security/api-guard';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const CopilotRequestSchema = z.object({
  workflow: z.enum([
    'sre_postmortem',
    'iteration_audit',
    'canary_runbook',
    'tavily_web_research',
    'custom',
  ]),
  customQuestion: z.string().trim().max(400).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: run } = await supabase
    .from('runs')
    .select('id, incident_id, user_id, is_demo')
    .eq('id', runId)
    .single();

  if (!run) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found or access denied.');
  }

  const { data: incident } = await supabase
    .from('incidents')
    .select('title, error_text_redacted, repository_full_name')
    .eq('id', run.incident_id)
    .single();

  const repoName = incident?.repository_full_name ?? 'ensuredesign/repomedic-fixture';
  const [memory, tavily] = await Promise.all([
    recallRepositoryEpisodicMemory({
      supabase,
      repositoryFullName: repoName,
      excludeRunId: run.is_demo ? undefined : run.id,
    }),
    searchIncidentIntelligenceWithTavily({
      incidentTitle:
        incident?.title ?? 'B2B tax-exempt orders (0% taxRatePercent) charged default tax',
      errorText: incident?.error_text_redacted,
    }),
  ]);

  return NextResponse.json({ memory, tavily });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rateKey = user ? `copilot:${user.id}` : `copilot:anon:${runId}`;
  const limit = enforceRateLimit(rateKey, 15, 60_000);
  if (!limit.allowed) {
    return apiErrorResponse(429, 'RATE_LIMITED', 'Co-Pilot rate limit exceeded. Wait a moment.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const parsed = CopilotRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const { data: run } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (!run) {
    return apiErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found or access denied.');
  }

  if (!run.is_demo && (!user || run.user_id !== user.id)) {
    return apiErrorResponse(403, 'FORBIDDEN', 'You do not have access to this private run.');
  }

  const { data: incident } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', run.incident_id)
    .single();

  if (!incident) {
    return apiErrorResponse(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
  }

  const { data: patches } = await supabase
    .from('patches')
    .select('*')
    .eq('run_id', runId)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const { data: tests } = await supabase
    .from('test_results')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  const latestPatch = patches?.[0] ?? null;
  const baselineTest = (tests ?? []).find((t) => t.kind === 'baseline');
  const candidateTest = (tests ?? []).filter((t) => t.kind === 'candidate').slice(-1)[0];

  const [memory, tavily] = await Promise.all([
    recallRepositoryEpisodicMemory({
      supabase,
      repositoryFullName: incident.repository_full_name,
      excludeRunId: run.is_demo ? undefined : run.id,
    }),
    searchIncidentIntelligenceWithTavily({
      incidentTitle: incident.title,
      errorText: incident.error_text_redacted,
      customQuery:
        parsed.data.workflow === 'custom' && parsed.data.customQuestion
          ? `${incident.title}: ${parsed.data.customQuestion}`
          : undefined,
    }),
  ]);

  const diag = run.diagnosis_json as { rootCause?: string } | null;

  try {
    const result = await runIncidentCopilotWithNemotron({
      workflow: parsed.data.workflow,
      customQuestion: parsed.data.customQuestion,
      repositoryFullName: incident.repository_full_name,
      baseSha: incident.base_sha,
      incidentTitle: incident.title,
      rootCause:
        diag?.rootCause ??
        'Falsy zero taxRatePercent coerced via logical OR (||) instead of nullish coalescing (??).',
      unifiedDiff: latestPatch?.unified_diff ?? 'No diff generated yet.',
      diffSha256: latestPatch?.diff_sha256 ?? 'pending',
      baselineSummary: baselineTest
        ? `Exit ${baselineTest.exit_code} (${baselineTest.failed ?? 1} failed, ${baselineTest.passed ?? 0} passed in ${baselineTest.duration_ms}ms)`
        : 'Baseline pending',
      candidateSummary: candidateTest
        ? `Exit ${candidateTest.exit_code} (${candidateTest.failed ?? 0} failed, ${candidateTest.passed ?? 0} passed in ${candidateTest.duration_ms}ms)`
        : 'Candidate pending',
      episodicMemoryBlock: memory.nemotronContextBlock,
      tavilyGroundingBlock: tavily.nemotronGroundingBlock,
    });

    if (!run.is_demo && user && run.user_id === user.id) {
      await supabase.rpc('append_run_event', {
        p_run_id: run.id,
        p_stage: run.current_stage,
        p_event_type: 'copilot_action_executed',
        p_summary: `Nemotron Co-Pilot + Tavily Grounding executed "${parsed.data.workflow}": ${result.data.title} (${result.latencyMs}ms)`,
        p_payload: {
          workflow: parsed.data.workflow,
          modelId: result.modelId,
          requestId: result.requestId,
          latencyMs: result.latencyMs,
          tavilyCitationsCount: tavily.citations.length,
          memoryInvariantLearned: result.data.memoryInvariantLearned,
        },
      });
    }

    return NextResponse.json({
      copilot: result.data,
      telemetry: {
        modelId: result.modelId,
        requestId: result.requestId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
        persistedToTimeline: Boolean(!run.is_demo && user && run.user_id === user.id),
      },
      memory,
      tavily,
    });
  } catch (err) {
    return apiErrorResponse(
      502,
      'COPILOT_INFERENCE_ERROR',
      err instanceof Error ? err.message : 'Nebius Nemotron Co-Pilot call failed.',
    );
  }
}
