'use client';

import { useEffect } from 'react';
import { captureReferralSource } from '@/lib/referral-source';

// Mounted once in the root layout so ?ref= is captured on *any* entry page,
// not just /curator. Renders nothing.
//
// Deliberately reads window.location instead of useSearchParams(): the latter
// would force every route in the app under a Suspense boundary / dynamic
// rendering, which would break the landing page's ISR. Every in-app link is a
// plain <a href> (full page load), so a mount-time read sees each URL.
export default function ReferralCapture() {
  useEffect(() => {
    captureReferralSource();
  }, []);
  return null;
}
