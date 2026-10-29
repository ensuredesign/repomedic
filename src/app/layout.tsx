import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://repomedic-eta.vercel.app'),
  title: 'RepoMedic — Diagnose. Patch. Prove.',
  description:
    'Autonomous production incident investigator powered by NVIDIA Nemotron on Nebius Token Factory, Nebius ConTree & Vercel Sandbox verification, LangSmith observability, and approval-gated GitHub draft pull requests.',
  icons: {
    icon: '/appimages/repomedic-logo-square.png',
    apple: '/appimages/repomedic-logo-square.png',
  },
  openGraph: {
    title: 'RepoMedic — Diagnose. Patch. Prove.',
    description:
      'Turn production exceptions into test-backed, security-audited draft pull requests with NVIDIA Nemotron, Nebius Token Factory Sandboxes, Vercel Sandbox, and LangSmith.',
    url: 'https://repomedic-eta.vercel.app',
    siteName: 'RepoMedic',
    images: [
      {
        url: '/appimages/why_repo_medic.png',
        width: 1536,
        height: 1024,
        alt: 'RepoMedic — Autonomous Closed-Loop Incident Investigator',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RepoMedic — Diagnose. Patch. Prove.',
    description:
      'Turn production exceptions into test-backed draft pull requests with NVIDIA Nemotron, Nebius Sandboxes, and LangSmith.',
    images: ['/appimages/why_repo_medic.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] antialiased selection:bg-[#6366F1]/15 selection:text-[#0A0A0A]">
        {children}
      </body>
    </html>
  );
}
