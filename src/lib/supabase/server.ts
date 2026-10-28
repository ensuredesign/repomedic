import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabasePublicEnv, supabaseFetchWithRetry } from './client';

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    global: { fetch: supabaseFetchWithRetry },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>,
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          }
        } catch {
          // Called from a Server Component where setting cookies is a no-op
        }
      },
    },
  });
}

export function createSupabaseAnonServerClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient(url, anonKey, {
    global: { fetch: supabaseFetchWithRetry },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
