import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPublicEpk } from '@/lib/epk';
import EditorialDarkTheme from '@/components/epk/themes/EditorialDark';
import SunsetCitypopTheme from '@/components/epk/themes/SunsetCitypop';

// Theme registry, keyed by artist_epks.theme. Unknown -> editorial_dark.
const THEMES = {
  editorial_dark: EditorialDarkTheme,
  sunset_citypop: SunsetCitypopTheme,
};

// Dedupe the DB fetch across generateMetadata() + the page render.
const loadEpk = cache((slug) => getPublicEpk(slug));

// The shared Supabase client forces `cache: 'no-store'`, so the route is
// inherently dynamic — render per request rather than fighting ISR.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const data = await loadEpk(params.slug);
  if (!data) return { title: 'EPK Not Found — OTONAMI' };

  const { artist, epk } = data;
  const desc =
    epk.tagline_en ||
    epk.tagline_jp ||
    (artist?.bio ? artist.bio.slice(0, 160) : 'Electronic Press Kit on OTONAMI');
  const title = `${artist?.name} — EPK | OTONAMI`;

  return {
    title,
    description: desc,
    openGraph: {
      title: `${artist?.name} — EPK`,
      description: desc,
      url: `https://otonami.io/epk/${epk.slug}`,
      type: 'profile',
      images: epk.og_image_url ? [{ url: epk.og_image_url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artist?.name} — EPK`,
      description: desc,
      images: epk.og_image_url ? [epk.og_image_url] : undefined,
    },
  };
}

export default async function EpkPage({ params }) {
  const data = await loadEpk(params.slug);
  if (!data) notFound();
  const Theme = THEMES[data.epk?.theme] || EditorialDarkTheme;
  return <Theme data={data} />;
}
