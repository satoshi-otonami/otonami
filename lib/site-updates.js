import { createClient } from '@supabase/supabase-js';

// lib/supabase.js pins fetch to cache:'no-store', which would force the landing
// route dynamic. The What's New feed wants ISR instead, so build a dedicated
// server-only client whose fetches join the route's hourly revalidation.
// Anon key only — site_updates is public-read via RLS, so no service key here.
function getSiteUpdatesSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, next: { revalidate: 3600 } }),
      },
    }
  );
}

// Hand-written kinds. Curator sign-ups are NOT written here any more — the
// feed builds them from the curators table (lib/whats-new.js).
const MANUAL_KINDS = new Set(['announcement', 'result', 'media']);

// Rows from before site_updates.kind existed that announced a curator. The
// curators table now covers these, so they are dropped rather than shown twice.
const LEGACY_CURATOR_PREFIXES = ['新規キュレーター登録', '今週のキュレーター紹介'];
const isCuratorRow = (u) =>
  u.kind === 'curator' || LEGACY_CURATOR_PREFIXES.some((p) => (u.title_ja || '').startsWith(p));

// Latest hand-written What's New entries (server-side only).
// Returns [] on any failure so the feed falls back to curator entries alone.
// select('*') so the page keeps working whether or not the kind column has
// been added yet; a missing/unknown kind reads as an announcement.
export async function getSiteUpdates(limit = 4) {
  try {
    const supabase = getSiteUpdatesSupabase();
    const { data, error } = await supabase
      .from('site_updates')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    return (data || [])
      .filter((u) => !isCuratorRow(u))
      .slice(0, limit)
      .map(u => ({
        id: u.id,
        kind: MANUAL_KINDS.has(u.kind) ? u.kind : 'announcement',
        publishedAt: u.published_at || null,
        titleJa: u.title_ja || '',
        titleEn: u.title_en || '',
        linkUrl: u.link_url || null,
      }));
  } catch {
    return [];
  }
}
