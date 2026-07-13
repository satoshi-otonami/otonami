import HomeClient from '@/components/landing/HomeClient';
import { getLandingCurators } from '@/lib/landing-curators';
import { getSiteUpdates } from '@/lib/site-updates';

// Landing curator marquee + What's New feed are fetched server-side and
// revalidated hourly (ISR).
export const revalidate = 3600;

export default async function Page() {
  const [curatorMarquee, siteUpdates] = await Promise.all([
    getLandingCurators(),
    getSiteUpdates(3),
  ]);
  return <HomeClient curatorMarquee={curatorMarquee} siteUpdates={siteUpdates} />;
}
