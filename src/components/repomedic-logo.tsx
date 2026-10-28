import React from 'react';

interface RepoMedicLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function RepoMedicLogo({
  size = 'md',
  showTagline = true,
  className = '',
}: RepoMedicLogoProps) {
  const dimensions = {
    sm: { box: 30, text: 'text-[15px]', tag: 'text-[10px]' },
    md: { box: 36, text: 'text-[17px]', tag: 'text-[10px]' },
    lg: { box: 44, text: 'text-[21px]', tag: 'text-[11px]' },
  }[size];

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Custom Isometric Code-Shield + Surgical Medical Cross + Git Commit Node SVG */}
      <span
        className="relative flex shrink-0 items-center justify-center rounded-[9px] border border-[#6366F1]/25 bg-gradient-to-br from-[#0A0A0A] via-[#18181B] to-[#1E1B4B] shadow-sm"
        style={{ width: dimensions.box, height: dimensions.box }}
      >
        <svg
          width={dimensions.box - 8}
          height={dimensions.box - 8}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="rm-shield-grad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="60%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="rm-cross-grad" x1="10" y1="10" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E0E7FF" />
            </linearGradient>
          </defs>

          {/* Outer Precision Hex-Shield Frame */}
          <path
            d="M16 2.5L27.5 7.2V15.8C27.5 22.7 22.6 27.9 16 29.8C9.4 27.9 4.5 22.7 4.5 15.8V7.2L16 2.5Z"
            stroke="url(#rm-shield-grad)"
            strokeWidth="2"
            fill="rgba(99, 102, 241, 0.14)"
          />

          {/* Surgical Patch Cross (RepoMedic Core Symbol) */}
          <path
            d="M14.2 9.5H17.8V14.2H22.5V17.8H17.8V22.5H14.2V17.8H9.5V14.2H14.2V9.5Z"
            fill="url(#rm-cross-grad)"
          />

          {/* Git Branch / Diff Pulse Nodes */}
          <circle cx="9.5" cy="9.5" r="1.8" fill="#818CF8" />
          <circle cx="22.5" cy="22.5" r="2.1" fill="#10B981" />
        </svg>

        {/* Live Verified Status Dot */}
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#FFFFFF] bg-[#10B981]"
          title="Nebius Nemotron + Vercel Sandbox Verified"
        />
      </span>

      <span className="flex flex-col leading-none">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`font-bold tracking-[-0.03em] text-[#0A0A0A] font-display ${dimensions.text}`}
          >
            Repo<span className="text-[#4F46E5]">Medic</span>
          </span>
          <span className="hidden rounded-[4px] border border-[#6366F1]/30 bg-[#6366F1]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#4F46E5] sm:inline-block">
            AI SRE
          </span>
        </span>
        {showTagline && (
          <span
            className={`mt-0.5 font-mono font-medium uppercase tracking-[0.08em] text-[#52525B] ${dimensions.tag}`}
          >
            Diagnose · Patch · Prove
          </span>
        )}
      </span>
    </span>
  );
}
