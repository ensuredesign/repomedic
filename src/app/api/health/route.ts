import { NextResponse } from 'next/server';
import { getNebiusConfig, verifyNebiusModelCatalog } from '@/lib/ai/nebius';
import { getGitHubToken } from '@/lib/github/client';
import { isVercelSandboxConfigured } from '@/lib/sandbox/runner';
import { getAllowedRepositories } from '@/lib/security/redact';
import { createSupabaseAnonServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createSupabaseAnonServerClient();
  let supabaseReachable = false;
  let demoRunPresent = false;

  try {
    const { data, error } = await supabase
      .from('runs')
      .select('id, status')
      .eq('is_demo', true)
      .limit(1);
    supabaseReachable = !error;
    demoRunPresent = Boolean(data && data.length > 0);
  } catch {
    supabaseReachable = false;
  }

  const nebiusCfg = getNebiusConfig();
  const catalog = nebiusCfg.apiKey
    ? await verifyNebiusModelCatalog()
    : {
        configured: false,
        reachable: false,
        baseUrl: nebiusCfg.baseUrl,
        configuredModel: nebiusCfg.configuredModel,
        resolvedNvidiaModel: null,
        availableNvidiaModels: [],
        error: 'NEBIUS_API_KEY not configured on server',
      };

  return NextResponse.json({
    status: supabaseReachable ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    integrations: {
      supabase: {
        reachable: supabaseReachable,
        demoSeeded: demoRunPresent,
      },
      nebiusTokenFactory: {
        configured: catalog.configured,
        reachable: catalog.reachable,
        baseUrl: catalog.baseUrl,
        configuredModel: catalog.configuredModel,
        resolvedNvidiaModel: catalog.resolvedNvidiaModel,
        error: catalog.error,
      },
      github: {
        tokenConfigured: Boolean(getGitHubToken()),
        allowedRepositories: getAllowedRepositories(),
      },
      vercelSandbox: {
        configured: isVercelSandboxConfigured(),
      },
    },
  });
}
