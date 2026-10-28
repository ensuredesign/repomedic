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
  title: 'RepoMedic — Diagnose. Patch. Prove.',
  description:
    'Autonomous production incident investigator powered by NVIDIA Nemotron on Nebius Token Factory, isolated Vercel Sandbox verification, and approval-gated GitHub draft pull requests.',
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
