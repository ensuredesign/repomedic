'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, LogIn, LogOut, PlusCircle, ShieldCheck, Terminal } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email ?? null);
      });
    } catch {
      // Ignore if env not loaded on static render
    }
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#9EB0C1]/15 bg-[#0B1017]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-[#F2F7FB] hover:text-[#28C8DB] transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#28C8DB]/40 bg-[#111923] text-[#28C8DB]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>RepoMedic</span>
            <span className="hidden rounded border border-[#9EB0C1]/20 bg-[#111923] px-2 py-0.5 font-mono text-[11px] font-normal text-[#9EB0C1] sm:inline-block">
              Diagnose. Patch. Prove.
            </span>
          </Link>

          <nav aria-label="Main Navigation" className="hidden items-center gap-1 md:flex">
            <Link
              href="/demo"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname?.startsWith('/demo')
                  ? 'bg-[#182331] text-[#28C8DB]'
                  : 'text-[#9EB0C1] hover:bg-[#111923] hover:text-[#F2F7FB]'
              }`}
            >
              Case Study &amp; Demo
            </Link>
            <Link
              href="/app"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === '/app'
                  ? 'bg-[#182331] text-[#28C8DB]'
                  : 'text-[#9EB0C1] hover:bg-[#111923] hover:text-[#F2F7FB]'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/app/incidents/new"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === '/app/incidents/new'
                  ? 'bg-[#182331] text-[#28C8DB]'
                  : 'text-[#9EB0C1] hover:bg-[#111923] hover:text-[#F2F7FB]'
              }`}
            >
              New Incident
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/incidents/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#28C8DB] px-3.5 py-1.5 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Investigate Bug</span>
          </Link>

          {userEmail ? (
            <div className="flex items-center gap-2">
              <span
                className="hidden max-w-[160px] truncate font-mono text-xs text-[#9EB0C1] sm:inline-block"
                title={userEmail}
              >
                {userEmail}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#9EB0C1]/25 bg-[#111923] px-3 py-1.5 text-xs font-medium text-[#F2F7FB] hover:border-[#F43F5E]/50 hover:text-[#F43F5E] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#9EB0C1]/25 bg-[#111923] px-3 py-1.5 text-xs font-medium text-[#F2F7FB] hover:border-[#28C8DB]/50 hover:text-[#28C8DB] transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile navigation strip */}
      <div className="flex items-center justify-around border-t border-[#9EB0C1]/10 bg-[#111923]/60 px-2 py-2 md:hidden">
        <Link
          href="/demo"
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
            pathname?.startsWith('/demo') ? 'text-[#28C8DB]' : 'text-[#9EB0C1]'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Demo</span>
        </Link>
        <Link
          href="/app"
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
            pathname === '/app' ? 'text-[#28C8DB]' : 'text-[#9EB0C1]'
          }`}
        >
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Runs</span>
        </Link>
        <Link
          href="/app/incidents/new"
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
            pathname === '/app/incidents/new' ? 'text-[#28C8DB]' : 'text-[#9EB0C1]'
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Incident</span>
        </Link>
      </div>
    </header>
  );
}
