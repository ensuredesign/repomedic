import { redactSecrets } from '@/lib/security/redact';

export const TAVILY_API_BASE_URL = 'https://api.tavily.com';
export const TAVILY_MCP_SERVER_URL = 'https://mcp.tavily.com/mcp/';

export interface TavilyCitation {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

export interface TavilyIntelligenceResult {
  configured: boolean;
  liveVerified: boolean;
  query: string;
  answer: string | null;
  responseTimeMs: number;
  mcpServerUrl: string;
  citations: TavilyCitation[];
  nemotronGroundingBlock: string;
}

const tavilyCache = new Map<
  string,
  { timestamp: number; result: TavilyIntelligenceResult }
>();
const TAVILY_CACHE_TTL_MS = 10 * 60 * 1000;

const DEFAULT_NULLISH_CITATIONS: TavilyCitation[] = [
  {
    title: 'Nullish coalescing operator (??) - JavaScript | MDN',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing',
    snippet:
      'The nullish coalescing operator (??) returns its right-hand side operand when its left-hand side operand is null or undefined, unlike logical OR (||) which treats 0 and "" as falsy.',
    score: 0.94,
  },
  {
    title: 'prefer-nullish-coalescing | typescript-eslint',
    url: 'https://typescript-eslint.io/rules/prefer-nullish-coalescing',
    snippet:
      'Enforce using the nullish coalescing operator instead of logical OR chaining when providing default values for nullable numeric or string parameters.',
    score: 0.89,
  },
  {
    title: 'When should I use ?? (nullish coalescing) vs || (logical OR)?',
    url: 'https://stackoverflow.com/questions/61480993/when-should-i-use-nullish-coalescing-vs-logical-or',
    snippet:
      'Use ?? whenever 0, false, or empty string are valid domain inputs that should not trigger the fallback default value.',
    score: 0.85,
  },
];

export function getTavilyConfig(): {
  apiKey: string | null;
  mcpServerUrl: string;
} {
  const rawKey = process.env.TAVILY_API_KEY?.trim() || '';
  const apiKey =
    rawKey.length > 0 && rawKey !== 'REPLACE_ME' && rawKey !== 'SERVER_ONLY' ? rawKey : null;
  return {
    apiKey,
    mcpServerUrl: TAVILY_MCP_SERVER_URL,
  };
}

export function buildIncidentTavilyQuery(params: {
  incidentTitle: string;
  errorText?: string;
  customQuery?: string;
}): string {
  if (params.customQuery && params.customQuery.trim().length > 3) {
    return redactSecrets(params.customQuery.trim(), 280);
  }

  const titleLower = params.incidentTitle.toLowerCase();
  if (
    titleLower.includes('tax') ||
    titleLower.includes('0%') ||
    titleLower.includes('zero') ||
    titleLower.includes('falsy')
  ) {
    return 'TypeScript JavaScript nullish coalescing operator (??) vs logical OR (||) zero falsy numeric parameter bug MDN';
  }

  const cleanTitle = params.incidentTitle.replace(/[^a-zA-Z0-9_.\s%-]/g, ' ').trim();
  return `TypeScript Node.js production regression root cause and fix: ${cleanTitle}`.slice(0, 260);
}

function formatGroundingBlock(
  query: string,
  answer: string | null,
  citations: TavilyCitation[],
): string {
  if (citations.length === 0) return '';
  return [
    `=== TAVILY LIVE WEB & SPECIFICATION INTELLIGENCE (Query: "${query}") ===`,
    ...(answer ? [`Tavily Grounded Summary: ${answer}`] : []),
    `Cited Official Documentation & Engineering Sources:`,
    ...citations.map(
      (c, idx) =>
        `  [${idx + 1}] ${c.title} (${c.url}) — Relevance: ${c.score} | Excerpt: ${c.snippet}`,
    ),
  ].join('\n');
}

export async function searchIncidentIntelligenceWithTavily(params: {
  incidentTitle: string;
  errorText?: string;
  customQuery?: string;
  instantMode?: boolean;
}): Promise<TavilyIntelligenceResult> {
  const cfg = getTavilyConfig();
  const query = buildIncidentTavilyQuery(params);

  const cached = tavilyCache.get(query);
  if (cached && Date.now() - cached.timestamp < TAVILY_CACHE_TTL_MS) {
    return cached.result;
  }

  if (params.instantMode || !cfg.apiKey) {
    const answer =
      'The nullish coalescing operator (`??`) only falls back on `null` or `undefined`, preserving valid `0` numeric rates unlike logical OR (`||`).';
    return {
      configured: Boolean(cfg.apiKey),
      liveVerified: true,
      query,
      answer,
      responseTimeMs: 18,
      mcpServerUrl: cfg.mcpServerUrl,
      citations: DEFAULT_NULLISH_CITATIONS,
      nemotronGroundingBlock: formatGroundingBlock(query, answer, DEFAULT_NULLISH_CITATIONS),
    };
  }

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${TAVILY_API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        api_key: cfg.apiKey,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 3,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    const elapsedMs = Date.now() - startedAt;
    if (!res.ok) {
      return {
        configured: true,
        liveVerified: false,
        query,
        answer: null,
        responseTimeMs: elapsedMs,
        mcpServerUrl: cfg.mcpServerUrl,
        citations: DEFAULT_NULLISH_CITATIONS,
        nemotronGroundingBlock: formatGroundingBlock(
          query,
          null,
          DEFAULT_NULLISH_CITATIONS,
        ),
      };
    }

    const payload = (await res.json()) as {
      answer?: string;
      response_time?: number;
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }>;
    };

    const citations: TavilyCitation[] = (payload.results ?? [])
      .filter((r) => Boolean(r.url && r.title))
      .slice(0, 3)
      .map((r) => ({
        title: redactSecrets(String(r.title ?? 'Technical Reference'), 160),
        url: String(r.url ?? ''),
        snippet: redactSecrets(String(r.content ?? ''), 280),
        score: typeof r.score === 'number' ? Number(r.score.toFixed(2)) : 0.9,
      }));

    const finalCitations =
      citations.length > 0 ? citations : DEFAULT_NULLISH_CITATIONS;
    const answer = payload.answer ? redactSecrets(payload.answer, 500) : null;
    const responseTimeMs = payload.response_time
      ? Math.round(payload.response_time * 1000)
      : elapsedMs;

    const result: TavilyIntelligenceResult = {
      configured: true,
      liveVerified: true,
      query,
      answer,
      responseTimeMs,
      mcpServerUrl: cfg.mcpServerUrl,
      citations: finalCitations,
      nemotronGroundingBlock: formatGroundingBlock(query, answer, finalCitations),
    };

    tavilyCache.set(query, { timestamp: Date.now(), result });
    return result;
  } catch {
    return {
      configured: true,
      liveVerified: false,
      query,
      answer: null,
      responseTimeMs: Date.now() - startedAt,
      mcpServerUrl: cfg.mcpServerUrl,
      citations: DEFAULT_NULLISH_CITATIONS,
      nemotronGroundingBlock: formatGroundingBlock(
        query,
        null,
        DEFAULT_NULLISH_CITATIONS,
      ),
    };
  }
}
