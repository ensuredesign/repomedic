import { createBrowserClient } from '@supabase/ssr';

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.',
    );
  }
  return { url, anonKey };
}

export async function supabaseFetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(input, init);
      const contentType = response.headers.get('content-type') || '';
      const isCloudflareOrGatewayError =
        response.status >= 500 ||
        (response.status >= 400 && contentType.includes('text/html'));

      if (!isCloudflareOrGatewayError || attempt === 4) {
        return response;
      }
    } catch (err) {
      lastError = err;
      if (attempt === 4) {
        throw err;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
  }
  throw lastError instanceof Error ? lastError : new Error('Supabase fetch failed after retries.');
}

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey, {
    global: { fetch: supabaseFetchWithRetry },
  });
}
