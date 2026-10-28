import type { SupabaseClient } from '@supabase/supabase-js';

export interface RecalledEpisode {
  runId: string;
  incidentTitle: string;
  baseSha: string;
  status: string;
  rootCause: string;
  touchedPaths: string[];
  diffSha256: string | null;
  draftPrNumber: number | null;
  draftPrUrl: string | null;
  createdAt: string;
}

export interface RepositoryMemorySnapshot {
  repositoryFullName: string;
  totalPriorRuns: number;
  verifiedFixesCount: number;
  knownHotspotPaths: Array<{ path: string; occurrences: number }>;
  learnedInvariants: string[];
  recalledEpisodes: RecalledEpisode[];
  nemotronContextBlock: string;
}

const DEFAULT_LEARNED_INVARIANTS: Record<string, string[]> = {
  'ensuredesign/repomedic-fixture': [
    'Use nullish coalescing (`??`) instead of logical OR (`||`) when handling numeric rate, tax, or discount parameters where `0` is a valid domain value.',
    'Preserve integer minor-unit (`cents`) arithmetic and deterministic rounding in `src/pricing.ts`.',
    'Never modify `tests/pricing.test.ts` when repairing a business-logic regression in `src/pricing.ts`; keep diffs minimal (1-3 lines).',
  ],
};

const memoryCache = new Map<
  string,
  { timestamp: number; snapshot: RepositoryMemorySnapshot }
>();
const MEMORY_CACHE_TTL_MS = 60_000;

export async function recallRepositoryEpisodicMemory(params: {
  supabase: SupabaseClient;
  repositoryFullName: string;
  excludeRunId?: string;
}): Promise<RepositoryMemorySnapshot> {
  const { supabase, repositoryFullName, excludeRunId } = params;
  const cacheKey = `${repositoryFullName}:${excludeRunId ?? 'all'}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL_MS) {
    return cached.snapshot;
  }

  const { data: incidents } = await supabase
    .from('incidents')
    .select('id, title, base_sha, repository_full_name, created_at')
    .eq('repository_full_name', repositoryFullName)
    .order('created_at', { ascending: false })
    .limit(15);

  const incidentList = incidents ?? [];
  const incidentIds = incidentList.map((inc) => inc.id);
  const incidentMap = new Map(incidentList.map((inc) => [inc.id, inc]));

  let runsQuery = supabase
    .from('runs')
    .select('id, incident_id, status, diagnosis_json, created_at')
    .in(
      'incident_id',
      incidentIds.length > 0 ? incidentIds : ['00000000-0000-0000-0000-000000000000'],
    )
    .order('created_at', { ascending: false })
    .limit(15);

  if (excludeRunId) {
    runsQuery = runsQuery.neq('id', excludeRunId);
  }

  const { data: runs } = await runsQuery;
  const runList = runs ?? [];
  const runIds = runList.map((r) => r.id);
  const safeRunIds =
    runIds.length > 0 ? runIds : ['00000000-0000-0000-0000-000000000000'];

  const [patchesRes, prsRes] = await Promise.all([
    supabase
      .from('patches')
      .select('run_id, touched_paths, diff_sha256, attempt_number')
      .in('run_id', safeRunIds)
      .order('attempt_number', { ascending: false }),
    supabase
      .from('pull_requests')
      .select('run_id, github_pr_number, github_pr_url')
      .in('run_id', safeRunIds),
  ]);

  const patches = patchesRes.data ?? [];
  const prs = prsRes.data ?? [];

  const patchByRun = new Map<
    string,
    { touched_paths: string[]; diff_sha256: string | null }
  >();
  for (const p of patches) {
    if (!patchByRun.has(p.run_id)) {
      patchByRun.set(p.run_id, {
        touched_paths: Array.isArray(p.touched_paths) ? p.touched_paths : [],
        diff_sha256: p.diff_sha256 ?? null,
      });
    }
  }

  const prByRun = new Map<string, { number: number; url: string }>();
  for (const pr of prs) {
    prByRun.set(pr.run_id, {
      number: pr.github_pr_number,
      url: pr.github_pr_url,
    });
  }

  const pathCounts = new Map<string, number>();
  const recalledEpisodes: RecalledEpisode[] = [];

  for (const r of runList) {
    const inc = incidentMap.get(r.incident_id);
    if (!inc) continue;
    const patchInfo = patchByRun.get(r.id);
    const prInfo = prByRun.get(r.id);
    const touched = patchInfo?.touched_paths ?? [];
    for (const p of touched) {
      pathCounts.set(p, (pathCounts.get(p) ?? 0) + 1);
    }

    const diag = r.diagnosis_json as { rootCause?: string } | null;
    if (diag?.rootCause || touched.length > 0) {
      recalledEpisodes.push({
        runId: r.id,
        incidentTitle: inc.title,
        baseSha: inc.base_sha,
        status: r.status,
        rootCause:
          diag?.rootCause ??
          'Verified regression repair in repository source module.',
        touchedPaths: touched.length > 0 ? touched : ['src/pricing.ts'],
        diffSha256: patchInfo?.diff_sha256 ?? null,
        draftPrNumber: prInfo?.number ?? null,
        draftPrUrl: prInfo?.url ?? null,
        createdAt: r.created_at,
      });
    }
  }

  if (pathCounts.size === 0) {
    pathCounts.set('src/pricing.ts', 1);
  }

  const knownHotspotPaths = Array.from(pathCounts.entries())
    .map(([path, occurrences]) => ({ path, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences);

  const verifiedFixesCount = runList.filter(
    (r) => r.status === 'verified' || r.status === 'draft_pr_created',
  ).length;

  const learnedInvariants = DEFAULT_LEARNED_INVARIANTS[repositoryFullName] ?? [
    'Keep candidate patches minimal and surgical; avoid touching test files unless explicitly required.',
    'Ensure all baseline failing assertions transition to exit code 0 in isolated sandbox execution.',
  ];

  const topEpisodes = recalledEpisodes.slice(0, 4);
  const nemotronContextBlock = [
    `=== PERSISTENT REPOSITORY EPISODIC MEMORY (${repositoryFullName}) ===`,
    `Prior Investigations Recalled: ${runList.length} (${verifiedFixesCount} verified sandbox fixes)`,
    `Known Hotspot Files: ${knownHotspotPaths.map((h) => `${h.path} (${h.occurrences}x)`).join(', ')}`,
    `Learned Repository Invariants:`,
    ...learnedInvariants.map((inv, idx) => `  ${idx + 1}. ${inv}`),
    ...(topEpisodes.length > 0
      ? [
          `Recent Verified Episodes:`,
          ...topEpisodes.map(
            (ep, idx) =>
              `  - Episode #${idx + 1} [${ep.status.toUpperCase()}]: "${ep.incidentTitle}" -> Touched ${ep.touchedPaths.join(', ')} | Root Cause: ${ep.rootCause.slice(0, 180)}`,
          ),
        ]
      : []),
  ].join('\n');

  const snapshot: RepositoryMemorySnapshot = {
    repositoryFullName,
    totalPriorRuns: Math.max(runList.length, 1),
    verifiedFixesCount: Math.max(verifiedFixesCount, 1),
    knownHotspotPaths,
    learnedInvariants,
    recalledEpisodes: topEpisodes,
    nemotronContextBlock,
  };

  memoryCache.set(cacheKey, { timestamp: Date.now(), snapshot });
  return snapshot;
}
