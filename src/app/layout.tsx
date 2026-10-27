import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen bg-[#0B1017] text-[#F2F7FB] font-sans selection:bg-[#28C8DB]/25 selection:text-[#F2F7FB]">
        {children}
      </body>
    </html>
  );
}
