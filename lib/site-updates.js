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

// Latest What's New entries (server-side only).
// Returns [] on any failure or when empty so the landing page can hide the
// section entirely (no empty frame).
export async function getSiteUpdates(limit = 3) {
  try {
    const supabase = getSiteUpdatesSupabase();
    const { data, error } = await supabase
      .from('site_updates')
      .select('id, published_at, title_ja, title_en, link_url')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    return (data || []).map(u => ({
      id: u.id,
      publishedAt: u.published_at || null,
      titleJa: u.title_ja || '',
      titleEn: u.title_en || '',
      linkUrl: u.link_url || null,
    }));
  } catch {
    return [];
  }
}
