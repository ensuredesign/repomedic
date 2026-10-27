import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { NavHeader } from '@/components/nav-header';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1017] text-[#F2F7FB]">
      <NavHeader />
      <main className="mx-auto flex flex-1 max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#F43F5E]/40 bg-[#F43F5E]/10 text-[#F43F5E]">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#F2F7FB]">404 — Route or Artifact Not Found</h1>
        <p className="mt-2 text-sm text-[#9EB0C1]">
          The requested incident or run does not exist or belongs to another authenticated user.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-[#28C8DB] px-4 py-2 text-xs font-semibold text-[#0B1017] hover:bg-[#21BD9D] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg border border-[#9EB0C1]/25 bg-[#111923] px-4 py-2 text-xs font-semibold text-[#F2F7FB] hover:border-[#28C8DB]/50"
          >
            <span>Open Demo Case Study</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
