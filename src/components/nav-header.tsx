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
    <header className="sticky top-0 z-40 border-b border-[#E8E8EC] bg-[#FFFFFF]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[16px] font-bold tracking-[-0.03em] text-[#0A0A0A] hover:text-[#6366F1] transition-colors font-display"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#E8E8EC] bg-[#FAFAFA] text-[#6366F1]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>RepoMedic</span>
          <span className="hidden rounded-[4px] border border-[#E8E8EC] bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] font-normal text-[#6B6B6B] sm:inline-block">
            Diagnose. Patch. Prove.
          </span>
        </Link>

        <nav aria-label="Main Navigation" className="hidden items-center gap-1 md:flex">
          <Link
            href="/demo"
            className={`rounded-[6px] px-3 py-1.5 text-[14px] font-medium transition-colors ${
              pathname?.startsWith('/demo')
                ? 'bg-[#6366F1] text-[#FFFFFF]'
                : 'text-[#6B6B6B] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
            }`}
          >
            Case Study &amp; Demo
          </Link>
          <Link
            href="/app"
            className={`rounded-[6px] px-3 py-1.5 text-[14px] font-medium transition-colors ${
              pathname === '/app'
                ? 'bg-[#6366F1] text-[#FFFFFF]'
                : 'text-[#6B6B6B] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/app/incidents/new"
            className={`rounded-[6px] px-3 py-1.5 text-[14px] font-medium transition-colors ${
              pathname === '/app/incidents/new'
                ? 'bg-[#6366F1] text-[#FFFFFF]'
                : 'text-[#6B6B6B] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
            }`}
          >
            New Incident
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/incidents/new"
            className="genesis-btn-primary inline-flex h-[32px] items-center gap-1.5 px-3 text-[13px]"
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Investigate Bug</span>
          </Link>

          {userEmail ? (
            <div className="flex items-center gap-2">
              <span
                className="hidden max-w-[160px] truncate font-mono text-[12px] text-[#6B6B6B] sm:inline-block"
                title={userEmail}
              >
                {userEmail}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="genesis-btn-secondary inline-flex h-[32px] items-center gap-1.5 px-3 text-[13px] hover:border-[#EF4444] hover:text-[#EF4444]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="genesis-btn-secondary inline-flex h-[32px] items-center gap-1.5 px-3 text-[13px]"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile navigation strip */}
      <div className="flex items-center justify-around border-t border-[#E8E8EC] bg-[#FAFAFA] px-2 py-2 md:hidden">
        <Link
          href="/demo"
          className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1 text-[13px] font-medium ${
            pathname?.startsWith('/demo') ? 'text-[#6366F1]' : 'text-[#6B6B6B]'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Demo</span>
        </Link>
        <Link
          href="/app"
          className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1 text-[13px] font-medium ${
            pathname === '/app' ? 'text-[#6366F1]' : 'text-[#6B6B6B]'
          }`}
        >
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Runs</span>
        </Link>
        <Link
          href="/app/incidents/new"
          className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1 text-[13px] font-medium ${
            pathname === '/app/incidents/new' ? 'text-[#6366F1]' : 'text-[#6B6B6B]'
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Incident</span>
        </Link>
      </div>
    </header>
  );
}
