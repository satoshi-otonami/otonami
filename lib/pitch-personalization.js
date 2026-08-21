/**
 * Per-curator personalization line for pitch emails.
 *
 * A bulk pitch sends one identical body to every recipient, so phrases like
 * "your playlist" land in a radio programmer's inbox and the send reads as a
 * blast. This builds one deterministic sentence from data we already have —
 * the curator's type and genres, and the track's genres — and the email layer
 * drops it in right under the greeting.
 *
 * Deliberately AI-free: no API call, no cost, no latency, and nothing that can
 * hallucinate a credit the curator does not have. Every sentence here is a
 * fixed template; the only variable content is genre names copied from the DB.
 *
 * NOT a source of claims: no numbers, no superlatives, no invented history.
 * When the inputs are too thin to say something true, it returns '' and the
 * email simply has no extra line. A missing sentence is always better than a
 * wrong one.
 */

// Roles read better than raw enum values in prose ("your work as an artist
// manager" beats "your work as a management curator"). Any type missing from
// this map is treated as unknown → no line at all.
const ROLE_LABELS = {
  playlist:   'a playlist curator',
  radio:      'a radio programmer',
  blog:       'a music writer',
  media:      'a music writer',
  label:      'a label',
  sync:       'a sync supervisor',
  management: 'an artist manager',
};

// Genre-aware opener per curator type. `management` is intentionally absent:
// none of these phrasings fit a manager, so it falls through to the generic
// line even when genres are known.
const GENRE_TEMPLATES = {
  // Deliberately NOT "I'm reaching out because your playlist focuses on ..."
  // (the original spec wording): AI-written pitch bodies very often open with
  // "I'm reaching out from Japan to share ...", and the two lines land back to
  // back, so the email stuttered. Observed in a real send — see the commit.
  playlist: (g) => `Your playlist's focus on ${g} is exactly where this track lives.`,
  radio:    (g) => `Your station's focus on ${g} made you an obvious first stop for this track.`,
  blog:     (g) => `Given your coverage of ${g}, I thought this might fit your editorial lens.`,
  media:    (g) => `Given your coverage of ${g}, I thought this might fit your editorial lens.`,
  label:    (g) => `As a label working in ${g}, I wanted to put this on your radar.`,
  sync:     (g) => `Since you place ${g} in sync contexts, this track felt worth your ears.`,
};

const MAX_LENGTH = 160;
const MAX_GENRES = 2;

/**
 * Fold a genre label for comparison only: "J-Synthwave", "J-synthwave" and
 * "JSynthwave" are all the same genre as far as a user's free-text input is
 * concerned, and all three exist in pitches.artist_genre today.
 */
function genreKey(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Lowercase a genre for use inside a sentence, without mangling the parts that
 * are proper nouns: "City Pop" → "city pop", but "R&B" stays "R&B" and
 * "J-Pop" → "J-pop" (the language prefix is a proper noun, the genre is not).
 */
function prettyGenre(label) {
  const s = String(label).trim();
  if (!s) return '';
  if (s.includes('&')) return s;                    // R&B, D&B — leave alone
  return s
    .split(/\s+/)
    .map(word =>
      // A single capital followed by a hyphen is a language prefix (J-Pop,
      // K-Rock): keep the prefix, lowercase the genre. Everything else —
      // including Hip-hop and Lo-fi, where the letter before the hyphen is
      // part of the word — lowercases whole.
      /^[A-Z]-/.test(word)
        ? word.slice(0, 2) + word.slice(2).toLowerCase()
        : word.toLowerCase()
    )
    .join(' ');
}

/**
 * Split whatever the caller has into a clean genre list.
 * Accepts an array (curators.genres / curators.accepts) or a comma-separated
 * string (pitches.artist_genre is TEXT, e.g. "Pop, J-Pop, City Pop").
 */
function toGenreList(input) {
  if (Array.isArray(input)) return input.map(g => String(g).trim()).filter(Boolean);
  if (typeof input === 'string') return input.split(',').map(g => g.trim()).filter(Boolean);
  return [];
}

/**
 * Curator genres. `genres` is the live column (33/43 curators); `accepts` holds
 * a second, smaller genre list on a handful of records and is used only as a
 * fallback — today it never fires alone, since every curator with `accepts` also
 * has `genres`.
 */
function curatorGenres(curator) {
  const primary = toGenreList(curator?.genres);
  return primary.length ? primary : toGenreList(curator?.accepts);
}

function joinGenres(list) {
  return list.slice(0, MAX_GENRES).map(prettyGenre).filter(Boolean).join(', ');
}

/**
 * Build the personalization sentence.
 *
 * @param {object} curator            { type, genres, accepts }
 * @param {string[]|null} matchReasons Reserved. pitches.match_reasons is NULL on
 *   every row in production (the column is never written), so nothing is derived
 *   from it — passing it changes nothing today.
 * @param {string[]|string} trackGenres Track/artist genres. Array or the
 *   comma-separated form stored in pitches.artist_genre.
 * @returns {string} Plain text, <= 160 chars, or '' when we cannot say
 *   something true. Callers must escape it for HTML.
 */
export function buildPersonalLine(curator, matchReasons, trackGenres) {
  const type = String(curator?.type || '').trim().toLowerCase();
  const role = ROLE_LABELS[type];
  // Unknown or missing type: we have nothing accurate to say about this
  // recipient, so say nothing.
  if (!role) return '';

  const generic = `I picked you specifically for this pitch — your work as ${role} stood out in our matching.`;

  const template = GENRE_TEMPLATES[type];
  const cGenres = curatorGenres(curator);
  // No genre template for this type (management), or the curator has no genre
  // information at all ("open to all genres") → type-only sentence.
  if (!template || !cGenres.length) {
    return generic.length <= MAX_LENGTH ? generic : '';
  }

  // Shared ground first: genres this curator and this track actually have in
  // common are the honest reason to reach out. Curator order is preserved so
  // the sentence leads with what they list first.
  const trackKeys = new Set(toGenreList(trackGenres).map(genreKey));
  const overlap = cGenres.filter(g => trackKeys.has(genreKey(g)));
  const chosen = overlap.length ? overlap : cGenres;

  // Try two genres, then one; if the names are long enough that even one
  // overflows, drop to the generic line rather than truncating mid-sentence.
  for (const count of [MAX_GENRES, 1]) {
    const line = template(joinGenres(chosen.slice(0, count)));
    if (line.length <= MAX_LENGTH) return line;
  }
  return generic.length <= MAX_LENGTH ? generic : '';
}
