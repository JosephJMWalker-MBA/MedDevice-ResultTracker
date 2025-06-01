
'use client';

import ProfileForm from '@/components/profile/profile-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <ProfileForm />
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Button asChild>
          <Link href="/">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Reading
          </Link>
        </Button>
      </div>
    </div>
  );
}
