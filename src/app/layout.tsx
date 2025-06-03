
// Removed 'use client';

import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/layout/app-header';
import ClientLayoutEffects from '@/components/layout/client-layout-effects'; 

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = { 
  title: 'PressureTrack AI',
  description: 'Track and understand your blood pressure readings with AI insights.',
  manifest: '/manifest.json', 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta property="og:image" content="https://placehold.co/1200x630.png" data-ai-hint="app banner" />
        <link rel="icon" href="https://placehold.co/48x48.png" data-ai-hint="heart ekg" type="image/png" />
        <link rel="apple-touch-icon" href="https://placehold.co/180x180.png" data-ai-hint="heart ekg" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ClientLayoutEffects /> 
        <div className="relative flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
