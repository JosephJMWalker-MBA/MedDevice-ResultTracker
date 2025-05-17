import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google'; // Using Inter as a common clean sans-serif
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/layout/app-header'; // Assuming AppHeader will be created

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: 'PressureTrack AI',
  description: 'Track and understand your blood pressure readings with AI insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <div className="relative flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
