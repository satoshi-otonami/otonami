import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPublicEpk } from '@/lib/epk';
import EditorialDarkTheme from '@/components/epk/themes/EditorialDark';
import SunsetCitypopTheme from '@/components/epk/themes/SunsetCitypop';
import BrutalistTheme from '@/components/epk/themes/Brutalist';

// Theme registry, keyed by artist_epks.theme. Unknown -> editorial_dark.
const THEMES = {
  editorial_dark: EditorialDarkTheme,
  sunset_citypop: SunsetCitypopTheme,
  brutalist: BrutalistTheme,
};

// Dedupe the DB fetch across generateMetadata() + the page render.
const loadEpk = cache((slug) => getPublicEpk(slug));

// The shared Supabase client forces `cache: 'no-store'`, so the route is
// inherently dynamic — render per request rather than fighting ISR.
export const dynamic = 'force-dynamic';

// og:image must be an absolute URL for SNS/email unfurlers. Stored Supabase
// storage URLs are already absolute; this only guards a stray relative path.
const SITE_ORIGIN = 'https://otonami.io';
function toAbsoluteUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({ params }) {
  const data = await loadEpk(params.slug);
  if (!data) return { title: 'EPK Not Found — OTONAMI' };

  const { artist, epk } = data;
  const desc =
    epk.tagline_en ||
    epk.tagline_jp ||
    (artist?.bio ? artist.bio.slice(0, 160) : 'Electronic Press Kit on OTONAMI');
  const title = `${artist?.name} — EPK | OTONAMI`;
  // OGP image: an explicit og_image_url wins; otherwise fall back to the
  // profile cover photo (artists.cover_url) so EPKs without a custom OG image
  // still unfurl with artwork. Both null → no image (unchanged behavior).
  const ogImage = toAbsoluteUrl(epk.og_image_url || artist?.cover_url);

  return {
    title,
    description: desc,
    openGraph: {
      title: `${artist?.name} — EPK`,
      description: desc,
      url: `https://otonami.io/epk/${epk.slug}`,
      type: 'profile',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: `${artist?.name} — EPK`,
      description: desc,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function EpkPage({ params }) {
  const data = await loadEpk(params.slug);
  if (!data) notFound();
  const Theme = THEMES[data.epk?.theme] || EditorialDarkTheme;
  return <Theme data={data} />;
}
