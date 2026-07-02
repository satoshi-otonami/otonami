import { createClient } from '@supabase/supabase-js';

// lib/supabase.js clients pin fetch to cache:'no-store', which would force the
// landing route dynamic. The marquee wants ISR instead, so build a dedicated
// server-only client whose fetches join the route's hourly revalidation.
function getLandingSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key',
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, next: { revalidate: 3600 } }),
      },
    }
  );
}

// Same public-visibility rule as /api/curators/list (is_seed null/false).
// "Test" dummy rows use lib/db.js isTestCurator's definition (name === 'test');
// they are additionally excluded here because the landing marquee shows names publicly.
const isTestCurator = (name) => (name || '').trim().toLowerCase() === 'test';

// Regions are free text; blank/NULL/"Global"/"Other" must not count as a country
// (the "countries" figure only counts actual country names).
const NON_COUNTRY_REGIONS = new Set(['global', 'other']);
const countryKey = (region) => {
  const r = (region || '').trim();
  if (!r || NON_COUNTRY_REGIONS.has(r.toLowerCase())) return null;
  return r.toLowerCase();
};

// Landing curator marquee data (server-side only, service key).
// Returns null on any failure so the landing page can hide the section entirely.
export async function getLandingCurators() {
  try {
    const supabase = getLandingSupabase();
    const { data, error } = await supabase
      .from('curators')
      .select('name, playlist, region, type, icon_url, created_at')
      .or('is_seed.is.null,is_seed.eq.false')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data || []).filter(c => !isTestCurator(c.name));
    if (rows.length === 0) return null;

    const countries = new Set();
    for (const c of rows) {
      const key = countryKey(c.region);
      if (key) countries.add(key);
    }

    return {
      count: rows.length,
      countries: countries.size,
      curators: rows.slice(0, 20).map(c => ({
        name: c.name || '',
        playlist: c.playlist || null,
        region: (c.region || '').trim() || null,
        type: c.type || null,
        iconUrl: c.icon_url || null,
      })),
    };
  } catch {
    return null;
  }
}
