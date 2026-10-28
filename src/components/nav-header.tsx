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
    <header className="sticky top-0 z-40 border-b border-[#E8E8EC] bg-[#FFFFFF]/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-14 max-w-[1280px] items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[16px] font-bold tracking-[-0.03em] text-[#0A0A0A] hover:text-[#6366F1] transition-colors font-display shrink-0"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#E8E8EC] bg-[#FAFAFA] text-[#6366F1]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>RepoMedic</span>
          <span className="hidden rounded-[4px] border border-[#E8E8EC] bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] font-normal text-[#52525B] lg:inline-block">
            Diagnose. Patch. Prove.
          </span>
        </Link>

        <nav aria-label="Main Navigation" className="hidden items-center gap-1 md:flex">
          <Link
            href="/demo"
            className={`rounded-[6px] px-3.5 py-2 text-[14px] font-medium transition-colors ${
              pathname?.startsWith('/demo')
                ? 'bg-[#6366F1] text-[#FFFFFF]'
                : 'text-[#52525B] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
            }`}
          >
            Case Study &amp; Demo
          </Link>
          <Link
            href="/app"
            className={`rounded-[6px] px-3.5 py-2 text-[14px] font-medium transition-colors ${
              pathname === '/app'
                ? 'bg-[#6366F1] text-[#FFFFFF]'
                : 'text-[#52525B] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/app/incidents/new"
            className={`rounded-[6px] px-3.5 py-2 text-[14px] font-medium transition-colors ${
              pathname === '/app/incidents/new'
                ? 'bg-[#6366F1] text-[#FFFFFF]'
                : 'text-[#52525B] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
            }`}
          >
            New Incident
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/app/incidents/new"
            className="genesis-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
          >
            <PlusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">Investigate Bug</span>
            <span className="xs:hidden sm:hidden">Investigate</span>
          </Link>

          {userEmail ? (
            <div className="flex items-center gap-2">
              <span
                className="hidden max-w-[160px] truncate font-mono text-[12px] text-[#52525B] lg:inline-block"
                title={userEmail}
              >
                {userEmail}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] hover:border-[#EF4444] hover:text-[#B91C1C]"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
            >
              <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile navigation strip — 44px touch targets per UI/UX Pro Max */}
      <nav
        aria-label="Mobile Navigation"
        className="grid grid-cols-3 gap-1 border-t border-[#E8E8EC] bg-[#FAFAFA] px-2 py-1.5 md:hidden"
      >
        <Link
          href="/demo"
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-[6px] px-2 text-[13px] font-medium transition-colors ${
            pathname?.startsWith('/demo')
              ? 'bg-[#6366F1] text-[#FFFFFF]'
              : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
          }`}
        >
          <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Demo</span>
        </Link>
        <Link
          href="/app"
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-[6px] px-2 text-[13px] font-medium transition-colors ${
            pathname === '/app'
              ? 'bg-[#6366F1] text-[#FFFFFF]'
              : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
          }`}
        >
          <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Runs</span>
        </Link>
        <Link
          href="/app/incidents/new"
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-[6px] px-2 text-[13px] font-medium transition-colors ${
            pathname === '/app/incidents/new'
              ? 'bg-[#6366F1] text-[#FFFFFF]'
              : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>New Incident</span>
        </Link>
      </nav>
    </header>
  );
}
