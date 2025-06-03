
'use client';

import { HeartPulse, UserCircle2, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export default function AppHeader() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstallable, setIsAppInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsAppInstallable(true);
      console.log('beforeinstallprompt event fired');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setInstallPrompt(null);
      setIsAppInstallable(false);
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <HeartPulse className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl sm:inline-block">
            PressureTrack AI
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
            {isAppInstallable && (
              <Button onClick={handleInstallClick} variant="outline" size="sm" className="text-foreground hover:bg-accent/50">
                <Download className="mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </Button>
            )}
            <Link href="/profile" legacyBehavior passHref>
                <Button variant="ghost" size="sm" className="text-foreground hover:bg-accent/50">
                    <UserCircle2 className="mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
                    Profile
                </Button>
            </Link>
        </nav>
      </div>
    </header>
  );
}
