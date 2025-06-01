
import { HeartPulse, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <HeartPulse className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl sm:inline-block">
            PressureTrack AI
          </span>
        </Link>
        <nav className="flex items-center gap-4">
            <Link href="/profile" legacyBehavior passHref>
                <Button variant="ghost" className="text-foreground hover:bg-accent/50">
                    <UserCircle2 className="h-5 w-5 mr-2" />
                    Profile
                </Button>
            </Link>
        </nav>
      </div>
    </header>
  );
}
