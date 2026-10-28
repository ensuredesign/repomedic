import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { NavHeader } from '@/components/nav-header';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <NavHeader />
      <main className="mx-auto flex flex-1 max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-[24px] font-bold text-[#0A0A0A] font-display">
          404 — Route or Artifact Not Found
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">
          The requested incident or run does not exist or belongs to another authenticated user.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/app"
            className="genesis-btn-primary inline-flex h-[38px] items-center gap-2 px-4 text-[13px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
          <Link
            href="/demo"
            className="genesis-btn-secondary inline-flex h-[38px] items-center gap-2 px-4 text-[13px]"
          >
            <span>Open Demo Case Study</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
