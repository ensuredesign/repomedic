'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  BookOpenCheck,
  ChevronDown,
  Home,
  LogIn,
  LogOut,
  Menu,
  PlusCircle,
  Shield,
  Sparkles,
  Terminal,
  UserCheck,
  UserCircle2,
  X,
} from 'lucide-react';
import { RepoMedicLogo } from '@/components/repomedic-logo';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'developer' | 'admin' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<'user' | 'admin' | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    try {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(async ({ data }) => {
        const user = data.user;
        setUserEmail(user?.email ?? null);
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          setUserRole((prof?.role as 'developer' | 'admin') ?? 'developer');
        } else {
          setUserRole(null);
        }
      });
    } catch {
      // Ignore if env not loaded on static render
    }
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserRole(null);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  }

  async function handleQuickSwitchPersona(persona: 'user' | 'admin') {
    setSwitchingRole(persona);
    try {
      const supabase = createSupabaseBrowserClient();
      const creds =
        persona === 'admin'
          ? {
              email: 'admin@repomedic.dev',
              password: 'RepoMedicAdmin!2026',
              target: '/admin',
              role: 'admin' as const,
            }
          : {
              email: 'judge@repomedic.dev',
              password: 'RepoMedicJudge!2026',
              target: '/app',
              role: 'developer' as const,
            };

      const { error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (!error) {
        setUserEmail(creds.email);
        setUserRole(creds.role);
        setAccountMenuOpen(false);
        setMobileMenuOpen(false);
        router.push(creds.target);
        router.refresh();
      }
    } finally {
      setSwitchingRole(null);
    }
  }

  const navItems = [
    {
      href: '/',
      label: 'Overview',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      href: '/demo',
      label: 'Case Study & Demo',
      badge: 'PROOF',
      icon: BookOpenCheck,
      isActive: Boolean(pathname?.startsWith('/demo')),
    },
    {
      href: '/app',
      label: 'Incident Runs',
      icon: Activity,
      isActive:
        pathname === '/app' ||
        (Boolean(pathname?.startsWith('/app/incidents/')) && pathname !== '/app/incidents/new'),
    },
    {
      href: '/app/incidents/new',
      label: 'Investigate Bug',
      icon: PlusCircle,
      isActive: pathname === '/app/incidents/new',
    },
    {
      href: '/app/profile',
      label: 'Profile',
      icon: UserCircle2,
      isActive: Boolean(pathname?.startsWith('/app/profile')),
    },
    {
      href: '/admin',
      label: 'Admin Panel',
      icon: Shield,
      isActive: Boolean(pathname?.startsWith('/admin')),
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#E8E8EC] bg-[#FFFFFF]/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[1280px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-[8px] focus-visible:outline-none"
          aria-label="RepoMedic Home"
        >
          <RepoMedicLogo size="md" showTagline={true} />
        </Link>

        {/* Desktop Segmented Navigation Pill Container */}
        <nav
          aria-label="Main Navigation"
          className="hidden items-center gap-1 rounded-[10px] border border-[#E8E8EC] bg-[#FAFAFA] p-1 lg:flex"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-all ${
                  item.isActive
                    ? 'bg-[#6366F1] text-[#FFFFFF] shadow-xs'
                    : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase ${
                      item.isActive
                        ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]'
                        : 'bg-[#10B981]/15 text-[#047857]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Cluster: CTA + Account / Persona Switcher */}
        <div className="flex items-center gap-2">
          <Link
            href="/app/incidents/new"
            className="genesis-btn-primary hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px]"
          >
            <PlusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>New Investigation</span>
          </Link>

          {userEmail ? (
            <div className="relative">
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-1.5 text-[12px] text-[#0A0A0A] hover:border-[#6366F1] transition-colors"
              >
                <UserCircle2 className="h-4 w-4 text-[#6366F1] shrink-0" aria-hidden="true" />
                <span className="hidden max-w-[130px] truncate font-mono text-[11px] sm:inline-block">
                  {userEmail}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    userRole === 'admin'
                      ? 'bg-[#6366F1]/15 text-[#4F46E5]'
                      : 'bg-[#ECFDF5] text-[#047857]'
                  }`}
                >
                  {userRole === 'admin' ? 'ADMIN' : 'DEV'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#52525B]" aria-hidden="true" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-[10px] border border-[#E8E8EC] bg-[#FFFFFF] p-2 shadow-lg z-50">
                  <div className="border-b border-[#E8E8EC] px-3 py-2">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#52525B]">
                      Signed In Session (RLS Active)
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[12px] font-semibold text-[#0A0A0A]">
                      {userEmail}
                    </div>
                  </div>

                  <div className="py-1.5 space-y-1">
                    <Link
                      href="/app/profile"
                      className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[13px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
                    >
                      <UserCircle2 className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                      <span>Profile &amp; Preferences</span>
                    </Link>
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[13px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
                    >
                      <Shield className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                      <span>Admin Control Plane</span>
                    </Link>
                  </div>

                  <div className="border-t border-[#E8E8EC] pt-2 pb-1 px-2">
                    <div className="px-1 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4F46E5] flex items-center gap-1">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      <span>1-Click Hackathon Persona Switch</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={switchingRole !== null}
                        onClick={() => handleQuickSwitchPersona('user')}
                        className="rounded-[6px] border border-[#E8E8EC] bg-[#FAFAFA] px-2.5 py-1.5 text-[11px] font-medium text-[#0A0A0A] hover:border-[#6366F1] text-left"
                      >
                        {switchingRole === 'user' ? 'Switching…' : 'Switch to Judge'}
                      </button>
                      <button
                        type="button"
                        disabled={switchingRole !== null}
                        onClick={() => handleQuickSwitchPersona('admin')}
                        className="rounded-[6px] border border-[#6366F1]/40 bg-[#6366F1]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#4F46E5] hover:bg-[#6366F1]/20 text-left"
                      >
                        {switchingRole === 'admin' ? 'Switching…' : 'Switch to Admin'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#E8E8EC] mt-1.5 pt-1.5">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-[13px] font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/auth"
                className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
              >
                <LogIn className="h-3.5 w-3.5 shrink-0 text-[#6366F1]" aria-hidden="true" />
                <span>Sign In / 1-Click Demo</span>
              </Link>
            </div>
          )}

          {/* Mobile Drawer Toggle Button */}
          <button
            type="button"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#E8E8EC] bg-[#FAFAFA] text-[#0A0A0A] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Quick Tab Bar (Always Visible on Mobile/Tablet < 1024px) */}
      <nav
        aria-label="Mobile Feature Tabs"
        className="grid grid-cols-5 gap-1 border-t border-[#E8E8EC] bg-[#FAFAFA] px-2 py-1.5 lg:hidden"
      >
        <Link
          href="/demo"
          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-[6px] px-1.5 text-[12px] font-medium transition-colors ${
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
          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-[6px] px-1.5 text-[12px] font-medium transition-colors ${
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
          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-[6px] px-1.5 text-[12px] font-medium transition-colors ${
            pathname === '/app/incidents/new'
              ? 'bg-[#6366F1] text-[#FFFFFF]'
              : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>New</span>
        </Link>
        <Link
          href="/app/profile"
          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-[6px] px-1.5 text-[12px] font-medium transition-colors ${
            pathname?.startsWith('/app/profile')
              ? 'bg-[#6366F1] text-[#FFFFFF]'
              : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
          }`}
        >
          <UserCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Profile</span>
        </Link>
        <Link
          href="/admin"
          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-[6px] px-1.5 text-[12px] font-medium transition-colors ${
            pathname?.startsWith('/admin')
              ? 'bg-[#6366F1] text-[#FFFFFF]'
              : 'text-[#52525B] hover:bg-[#FFFFFF] hover:text-[#0A0A0A]'
          }`}
        >
          <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Admin</span>
        </Link>
      </nav>

      {/* Expandable Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#E8E8EC] bg-[#FFFFFF] px-4 py-4 space-y-4 lg:hidden">
          <div className="grid grid-cols-1 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[44px] items-center justify-between rounded-[8px] px-3.5 py-2.5 text-[14px] font-medium ${
                    item.isActive
                      ? 'bg-[#6366F1] text-[#FFFFFF]'
                      : 'bg-[#FAFAFA] text-[#0A0A0A] hover:bg-[#E8E8EC]/50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className="rounded bg-[#10B981]/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#047857]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="rounded-[8px] border border-[#6366F1]/30 bg-[#FAFAFA] p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-[#4F46E5]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Instant Hackathon Jury Persona Switch</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={switchingRole !== null}
                onClick={() => handleQuickSwitchPersona('user')}
                className="genesis-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-3 text-[13px]"
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                <span>
                  {switchingRole === 'user' ? 'Signing in…' : '1-Click User / Judge Login'}
                </span>
              </button>
              <button
                type="button"
                disabled={switchingRole !== null}
                onClick={() => handleQuickSwitchPersona('admin')}
                className="genesis-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 px-3 text-[13px] font-semibold text-[#4F46E5]"
              >
                <Shield className="h-4 w-4 text-[#4F46E5]" aria-hidden="true" />
                <span>{switchingRole === 'admin' ? 'Signing in…' : '1-Click Admin Login'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
