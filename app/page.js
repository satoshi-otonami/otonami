import HomeClient from '@/components/landing/HomeClient';
import { getLandingCurators } from '@/lib/landing-curators';
import { getSiteUpdates } from '@/lib/site-updates';
import { getPublishedLpCases } from '@/lib/lp-cases';
import { buildWhatsNew } from '@/lib/whats-new';

// Landing curator marquee + What's New feed are fetched server-side and
// revalidated hourly (ISR).
export const revalidate = 3600;

export default async function Page() {
  const [curatorMarquee, manualUpdates] = await Promise.all([
    getLandingCurators(),
    getSiteUpdates(4),
  ]);
  // New curators (from the curators table) mixed with hand-written news.
  const siteUpdates = buildWhatsNew({
    curators: curatorMarquee?.curators ?? [],
    manual: manualUpdates,
    limit: 4,
  });
  // Filtered here so unpublished result cards never reach the client bundle.
  return (
    <HomeClient
      curatorMarquee={curatorMarquee}
      siteUpdates={siteUpdates}
      lpCases={getPublishedLpCases()}
    />
  );
}
