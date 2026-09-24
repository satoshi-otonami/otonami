import { curatorDisplayName, curatorRegionLabel, curatorTypeLabel } from '@/lib/curator-labels';

// LP "What's New" feed: newly joined curators (built from the curators table)
// mixed with hand-written entries from site_updates (news, results, media),
// newest first. Server-side only — the result is passed to the client as props.

export const WHATS_NEW_KINDS = ['curator', 'result', 'announcement', 'media'];

// curators.created_at is UTC; the feed prints the JST calendar date, the same
// convention as site_updates.published_at.
function jstDate(iso) {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return null;
  return new Date(t + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// The one place a curator entry's wording is assembled.
export function curatorUpdateTitle(curator, lang) {
  const name = curatorDisplayName(curator);
  const type = curatorTypeLabel(curator.type, lang);
  const region = curatorRegionLabel(curator.region, lang);
  const meta = region ? `${type} / ${region}` : type;
  return lang === 'en' ? `New curator: ${name} (${meta})` : `新規キュレーター登録: ${name}（${meta}）`;
}

/**
 * @param {Array} curators  public curators, newest first (getLandingCurators().curators)
 * @param {Array} manual    site_updates rows (getSiteUpdates()), curator rows already dropped
 */
export function buildWhatsNew({ curators = [], manual = [], limit = 4 }) {
  const fromCurators = curators
    .map((c, i) => ({
      id: `curator-${i}-${c.createdAt || ''}`,
      kind: 'curator',
      publishedAt: jstDate(c.createdAt),
      sortKey: c.createdAt || '',
      titleJa: curatorUpdateTitle(c, 'ja'),
      titleEn: curatorUpdateTitle(c, 'en'),
      linkUrl: '/curators',
    }))
    .filter((u) => u.publishedAt);

  // Manual rows carry a date only; sort them at the end of that JST day so a
  // same-day announcement sits above that day's sign-ups.
  const fromManual = manual.map((u) => ({
    ...u,
    sortKey: u.publishedAt ? `${u.publishedAt}T23:59:59+09:00` : '',
  }));

  return [...fromCurators, ...fromManual]
    .sort((a, b) => (Date.parse(b.sortKey) || 0) - (Date.parse(a.sortKey) || 0))
    .slice(0, limit)
    .map(({ sortKey, ...u }) => u);
}
