'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, type User } from '../lib/api';

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  // localStorage is client-only, so read it after mount to keep SSR markup
  // and the first client render identical. Re-reading on every navigation
  // matters because the nav lives in the root layout and never unmounts: after
  // signing in, the admin-only links would otherwise stay hidden until a full
  // page reload.
  useEffect(() => {
    setUser(auth.user());
  }, [pathname]);

  return (
    <nav>
      <strong>Secure Notes</strong>
      <Link href="/notes">Notes</Link>
      {user?.role === 'admin' && <Link href="/admin/users">Users</Link>}
      {user?.role === 'admin' && <Link href="/insights">Insights</Link>}
      <Link href="/posts">Posts</Link>
      <span className="spacer" />
      {user ? (
        <>
          <span className="muted">
            {user.email} ({user.role})
          </span>
          <button
            onClick={() => {
              auth.clear();
              setUser(null);
              router.push('/login');
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        <Link href="/login">Sign in</Link>
      )}
    </nav>
  );
}
