'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmitPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/curators');
  }, [router]);
  return null;
}
