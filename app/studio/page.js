'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Render OtonamiApp client-only (ssr: false). The component reads
// window/localStorage in useState initializers, so server-rendering it
// produced a different first paint than the client (a "landing" shell vs the
// logged-in studio), causing a hydration mismatch that — with no error
// boundary — blanked the whole page on the first /studio navigation.
// Client-only rendering removes the mismatch entirely.
const OtonamiApp = dynamic(() => import('@/components/OtonamiApp'), {
  ssr: false,
  loading: () => <StudioLoading />,
});

function StudioLoading() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8f7f4', color: '#c4956a', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
    }}>
      読み込み中…
    </div>
  );
}

export default function StudioPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<StudioLoading />}>
        <OtonamiApp />
      </Suspense>
    </ErrorBoundary>
  );
}
