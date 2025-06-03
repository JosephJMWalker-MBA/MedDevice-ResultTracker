
// Removed 'use client';

import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/layout/app-header';
import ClientLayoutEffects from '@/components/layout/client-layout-effects'; // New import

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = { // This can now be exported
  title: 'PressureTrack AI',
  description: 'Track and understand your blood pressure readings with AI insights.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // useEffect for service worker registration removed from here

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Other head elements */}
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ClientLayoutEffects /> {/* Render the client effects component */}
        <div className="relative flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
