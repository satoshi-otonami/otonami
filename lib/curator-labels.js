// Public-facing labels for a curator row: display name, type, region.
// One place for the wording so the LP marquee and the What's New feed (and
// anything else that prints a curator) never drift apart — e.g. "Global" vs
// "グローバル". Plain functions, safe to import from client components.

const TYPE_LABELS = {
  playlist:      { ja: 'プレイリスト', en: 'Playlist' },
  radio:         { ja: 'ラジオ', en: 'Radio' },
  media:         { ja: '音楽メディア', en: 'Media' },
  blog:          { ja: 'ブログ', en: 'Blog' },
  sync:          { ja: 'シンク', en: 'Sync' },
  label:         { ja: 'レーベル', en: 'Label' },
  management:    { ja: 'マネジメント', en: 'Management' },
  booking_agent: { ja: 'ブッキング', en: 'Booking' },
  other:         { ja: 'キュレーター', en: 'Curator' },
};

// curators.region is free text (English country names in practice). Countries
// not listed here fall back to the stored text in both languages.
const REGION_JA = {
  'united states': 'アメリカ',
  usa: 'アメリカ',
  us: 'アメリカ',
  'united kingdom': 'イギリス',
  uk: 'イギリス',
  japan: '日本',
  italy: 'イタリア',
  brazil: 'ブラジル',
  france: 'フランス',
  spain: 'スペイン',
  poland: 'ポーランド',
  canada: 'カナダ',
  germany: 'ドイツ',
  serbia: 'セルビア',
  peru: 'ペルー',
  turkey: 'トルコ',
  mexico: 'メキシコ',
  australia: 'オーストラリア',
  netherlands: 'オランダ',
  portugal: 'ポルトガル',
  argentina: 'アルゼンチン',
  'south korea': '韓国',
  korea: '韓国',
};

const pickLang = (lang) => (lang === 'en' ? 'en' : 'ja');

export function curatorTypeLabel(type, lang) {
  const l = TYPE_LABELS[type] || TYPE_LABELS.other;
  return l[pickLang(lang)];
}

// null when there is nothing worth printing: "Other" says nothing, and a
// blank region is unknown rather than global.
export function curatorRegionLabel(region, lang) {
  const r = (region || '').trim();
  if (!r) return null;
  const key = r.toLowerCase();
  if (key === 'other') return null;
  if (key === 'global') return lang === 'en' ? 'Global' : 'グローバル';
  if (lang === 'en') return r;
  return REGION_JA[key] || r;
}

const PLATFORM_WORDS = new Set([
  'spotify', 'apple', 'apple music', 'deezer', 'pandora', 'youtube', 'youtube music',
  'soundcloud', 'tidal', 'amazon', 'amazon music', 'bandcamp',
]);

// curators.playlist is free text: usually the outlet's name, but sometimes a
// URL ("www.timemachinemusic.org") or a list of platforms
// ("Spotify / Apple / Deezer / Pandora / YouTube"). Those read as noise, so
// fall back to the curator's own name.
function isNoisyPlaylist(text) {
  const t = text.trim().toLowerCase();
  if (/^https?:\/\//.test(t) || t.startsWith('www.')) return true;
  if (!/\s/.test(t) && /\.[a-z]{2,}(\/|$)/.test(t)) return true;
  const parts = t.split(/\s*[/,|]\s*/).filter(Boolean);
  return parts.length > 0 && parts.every((p) => PLATFORM_WORDS.has(p));
}

export function curatorDisplayName(curator) {
  const playlist = (curator?.playlist || '').trim();
  const name = (curator?.name || '').trim();
  if (playlist && !isNoisyPlaylist(playlist)) return playlist;
  return name || playlist;
}
