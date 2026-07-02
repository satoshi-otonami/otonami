import HomeClient from '@/components/landing/HomeClient';
import { getLandingCurators } from '@/lib/landing-curators';

// Landing curator marquee data is fetched server-side and revalidated hourly (ISR).
export const revalidate = 3600;

export default async function Page() {
  const curatorMarquee = await getLandingCurators();
  return <HomeClient curatorMarquee={curatorMarquee} />;
}
