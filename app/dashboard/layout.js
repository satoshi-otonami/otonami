'use client';

/**
 * Auth guard for ALL /dashboard/* routes (artist surface).
 *
 * artist_token lives in localStorage (separate from curator_token), so it can't
 * be read by middleware/server — the gate must run client-side. We start in a
 * 'checking' state and render NOTHING until a token is confirmed, so an
 * unauthenticated visitor never sees a flash of dashboard content before the
 * redirect to /artist/login. Individual pages keep their own API-level 401
 * handling; this layout is the shared first line so new /dashboard children are
 * protected by default.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'ok'

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('artist_token')
        : null;
    if (!token) {
      router.replace('/artist/login');
      return; // never reveal dashboard content
    }
    setAuthState('ok');
  }, [router]);

  // checking / unauthenticated → render nothing (no flash, no info leak)
  if (authState !== 'ok') return null;

  return children;
}
