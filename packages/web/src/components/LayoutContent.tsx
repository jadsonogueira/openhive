'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

const PUBLIC_PATHS = ['/invite'];

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 p-8">
        {/* Gradient bar decorativa */}
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-700 rounded-full mb-6" />
        {children}
      </main>
    </div>
  );
}
