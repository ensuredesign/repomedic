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
  UserCheck,
  UserCircle2,
  X,
} from 'lucide-react';
import { RepoMedicLogo } from '@/components/repomedic-logo';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const AUTH_EMAIL_CACHE_KEY = 'repomedic_auth_email';
const AUTH_ROLE_CACHE_KEY = 'repomedic_auth_role';

export function primeAuthSessionCache(email: string | null, role: 'developer' | 'admin' | null) {
  if (typeof window === 'undefined') return;
  try {
    if (email) {
      window.sessionStorage.setItem(AUTH_EMAIL_CACHE_KEY, email);
      window.sessionStorage.setItem(AUTH_ROLE_CACHE_KEY, role ?? 'developer');
    } else {
      window.sessionStorage.removeItem(AUTH_EMAIL_CACHE_KEY);
      window.sessionStorage.removeItem(AUTH_ROLE_CACHE_KEY);
    }
  } catch {
    // Ignore storage restriction
  }
}

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

    // 1. Instant 0ms read from sessionStorage cache
    try {
      const cachedEmail = window.sessionStorage.getItem(AUTH_EMAIL_CACHE_KEY);
      const cachedRole = window.sessionStorage.getItem(AUTH_ROLE_CACHE_KEY) as
        | 'developer'
        | 'admin'
        | null;
      if (cachedEmail) {
        setUserEmail(cachedEmail);
        setUserRole(cachedRole ?? 'developer');
      }
    } catch {
      // Ignore storage error
    }

    // 2. Prefetch primary routes once so tab clicks feel instantaneous
    try {
      router.prefetch('/demo');
      router.prefetch('/app');
      router.prefetch('/app/profile');
      router.prefetch('/admin');
      router.prefetch('/auth');
    } catch {
      // Ignore prefetch error
    }

    // 3. Fast local JWT session read via getSession() (0ms, no network roundtrip)
    try {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user ?? null;
        if (!user) {
          setUserEmail(null);
          setUserRole(null);
          primeAuthSessionCache(null, null);
          return;
        }
        const email = user.email ?? null;
        const inferredRole: 'developer' | 'admin' =
          email?.toLowerCase() === 'admin@repomedic.dev' ||
          user.user_metadata?.role === 'admin'
            ? 'admin'
            : 'developer';
        setUserEmail(email);
        setUserRole(inferredRole);
        primeAuthSessionCache(email, inferredRole);
      });
    } catch {
      // Ignore if env not loaded on static render
    }
  }, [pathname, router]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    primeAuthSessionCache(null, null);
    setUserEmail(null);
    setUserRole(null);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/');
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
        primeAuthSessionCache(creds.email, creds.role);
        setUserEmail(creds.email);
        setUserRole(creds.role);
        setAccountMenuOpen(false);
        setMobileMenuOpen(false);
        router.push(creds.target);
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
    <header className="sticky top-0 z-40 apple-glass-nav">
      <div className="mx-auto flex min-h-16 max-w-[1280px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-[10px] focus-visible:outline-none"
          aria-label="RepoMedic Home"
        >
          <RepoMedicLogo size="md" showTagline={true} />
        </Link>

        {/* Desktop Apple-Style Segmented Navigation Pill Container */}
        <nav
          aria-label="Main Navigation"
          className="hidden items-center gap-1 rounded-full border border-black/[0.08] bg-black/[0.03] p-1 lg:flex"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  item.isActive
                    ? 'bg-[#1D1D1F] text-[#FFFFFF] shadow-xs'
                    : 'text-[#515154] hover:bg-white/80 hover:text-[#1D1D1F]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase ${
                      item.isActive
                        ? 'bg-[#28CD41]/25 text-[#30D158]'
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
            className="genesis-btn-primary hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px]"
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
                className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-black/[0.1] bg-white/90 px-3.5 py-1.5 text-[12px] text-[#1D1D1F] hover:border-[#0071E3] transition-colors"
              >
                <UserCircle2 className="h-4 w-4 text-[#0071E3] shrink-0" aria-hidden="true" />
                <span className="hidden max-w-[130px] truncate font-mono text-[11px] sm:inline-block">
                  {userEmail}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    userRole === 'admin'
                      ? 'bg-[#0071E3]/12 text-[#0071E3]'
                      : 'bg-[#ECFDF5] text-[#047857]'
                  }`}
                >
                  {userRole === 'admin' ? 'ADMIN' : 'DEV'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#515154]" aria-hidden="true" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-[16px] border border-black/[0.08] bg-[#FFFFFF] p-2 shadow-xl z-50">
                  <div className="border-b border-black/[0.06] px-3 py-2">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#515154]">
                      Signed In Session (RLS Active)
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[12px] font-semibold text-[#1D1D1F]">
                      {userEmail}
                    </div>
                  </div>

                  <div className="py-1.5 space-y-1">
                    <Link
                      href="/app/profile"
                      className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] text-[#1D1D1F] hover:bg-[#F5F5F7]"
                    >
                      <UserCircle2 className="h-4 w-4 text-[#0071E3]" aria-hidden="true" />
                      <span>Profile &amp; Preferences</span>
                    </Link>
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] text-[#1D1D1F] hover:bg-[#F5F5F7]"
                    >
                      <Shield className="h-4 w-4 text-[#0071E3]" aria-hidden="true" />
                      <span>Admin Control Plane</span>
                    </Link>
                  </div>

                  <div className="border-t border-black/[0.06] pt-2 pb-1 px-2">
                    <div className="px-1 font-mono text-[10px] uppercase tracking-wider text-[#515154] mb-1.5">
                      Instant Hackathon Persona Switch
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={switchingRole !== null}
                        onClick={() => handleQuickSwitchPersona('user')}
                        className="inline-flex items-center justify-center gap-1 rounded-[8px] border border-black/[0.08] bg-[#F5F5F7] px-2 py-1.5 text-[11px] font-medium text-[#1D1D1F] hover:border-[#0071E3]"
                      >
                        <UserCheck className="h-3 w-3 text-[#047857]" aria-hidden="true" />
                        <span>{switchingRole === 'user' ? 'Switching…' : 'Judge User'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={switchingRole !== null}
                        onClick={() => handleQuickSwitchPersona('admin')}
                        className="inline-flex items-center justify-center gap-1 rounded-[8px] border border-black/[0.08] bg-[#F5F5F7] px-2 py-1.5 text-[11px] font-medium text-[#1D1D1F] hover:border-[#0071E3]"
                      >
                        <Shield className="h-3 w-3 text-[#0071E3]" aria-hidden="true" />
                        <span>{switchingRole === 'admin' ? 'Switching…' : 'Admin Mode'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-black/[0.06] pt-1.5 mt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <Link
                  href="/auth"
                  className="genesis-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px]"
                >
                  <LogIn className="h-3.5 w-3.5 text-[#0071E3]" aria-hidden="true" />
                  <span>Sign In</span>
                </Link>
                <button
                  type="button"
                  aria-label="Quick Demo Login Menu"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="hidden sm:inline-flex min-h-[38px] items-center gap-1 rounded-full border border-[#0071E3]/30 bg-[#0071E3]/8 px-3 py-1.5 font-mono text-[11px] font-semibold text-[#0071E3] hover:bg-[#0071E3]/14 transition-colors"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  <span>1-Click Demo</span>
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-[16px] border border-black/[0.08] bg-[#FFFFFF] p-3 shadow-xl z-50 space-y-2">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0071E3]">
                    Instant Hackathon Jury Access
                  </div>
                  <p className="text-[12px] text-[#515154] leading-snug">
                    Sign in with 1 click to inspect live runs or platform governance:
                  </p>
                  <button
                    type="button"
                    disabled={switchingRole !== null}
                    onClick={() => handleQuickSwitchPersona('user')}
                    className="genesis-btn-primary flex w-full items-center justify-center gap-2 px-3 py-2 text-[12px]"
                  >
                    <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {switchingRole === 'user'
                        ? 'Signing in as Judge…'
                        : '1-Click Judge / User Login'}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={switchingRole !== null}
                    onClick={() => handleQuickSwitchPersona('admin')}
                    className="genesis-btn-secondary flex w-full items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold text-[#0071E3]"
                  >
                    <Shield className="h-3.5 w-3.5 text-[#0071E3]" aria-hidden="true" />
                    <span>
                      {switchingRole === 'admin'
                        ? 'Signing in as Admin…'
                        : '1-Click Admin Panel Login'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.1] bg-white text-[#1D1D1F] lg:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Compact Mobile Horizontal Tab Bar */}
      <nav
        aria-label="Mobile Quick Tabs"
        className="flex items-center gap-1 overflow-x-auto border-t border-black/[0.06] bg-white/75 px-3 py-1.5 lg:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                item.isActive
                  ? 'bg-[#1D1D1F] text-[#FFFFFF]'
                  : 'bg-white text-[#515154] border border-black/[0.08]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Expandable Mobile Drawer for Full Navigation & Instant Persona Switch */}
      {mobileMenuOpen && (
        <div className="border-t border-black/[0.08] bg-[#FFFFFF] px-4 py-4 shadow-lg lg:hidden space-y-4">
          <div className="grid grid-cols-1 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-[12px] px-3.5 py-2.5 text-[14px] font-medium ${
                    item.isActive
                      ? 'bg-[#1D1D1F] text-[#FFFFFF]'
                      : 'bg-[#F5F5F7] text-[#1D1D1F]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className="rounded-full bg-[#10B981]/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#047857]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="rounded-[14px] border border-black/[0.08] bg-[#F5F5F7] p-3 space-y-2">
            <div className="font-mono text-[11px] font-semibold uppercase text-[#0071E3]">
              1-Click Hackathon Demo Access
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={switchingRole !== null}
                onClick={() => handleQuickSwitchPersona('user')}
                className="genesis-btn-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-[13px]"
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                <span>
                  {switchingRole === 'user' ? 'Signing in…' : '1-Click Judge / User Login'}
                </span>
              </button>
              <button
                type="button"
                disabled={switchingRole !== null}
                onClick={() => handleQuickSwitchPersona('admin')}
                className="genesis-btn-secondary inline-flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-semibold text-[#0071E3]"
              >
                <Shield className="h-4 w-4 text-[#0071E3]" aria-hidden="true" />
                <span>{switchingRole === 'admin' ? 'Signing in…' : '1-Click Admin Login'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
