'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import React from 'react';
import { AuthContext } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = React.useContext(AuthContext);
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) return <div className="grid place-items-center h-[60vh]">Loading…</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/students" className="font-medium">Students</Link>
            <Link href="/dashboard" className="opacity-70 hover:opacity-100">Dashboard</Link>
          </nav>
          <button
            onClick={() => signOut(auth)}
            className="rounded-md px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
