/**
 * Who the pitch email's "Hi …," line addresses.
 *
 * curators.name is a free-text display name, and for a large share of the
 * roster it is the outlet, not a person: "Tinnitist", "PA74Music Publishing",
 * "Rádio Armazém", "This Light". "Hi Tinnitist," reads as a mail merge gone
 * wrong, which is worse than the neutral "Hi there,".
 *
 * So this is deliberately conservative: it returns the name only when it is
 * confidently a person's name, and null (→ "Hi there,") for anything else,
 * including every case it is unsure about. A missed personal greeting costs
 * nothing; a wrong one costs credibility with the curator.
 *
 * A name counts as personal only when ALL of these hold:
 *   - 2–3 words (a single word — "Bartek", "Sasha", "Leap" — may be a person
 *     or a brand; we cannot tell, so no)
 *   - each word is Capitalized-lowercase letters ("Matheus", "Todesco"); an
 *     optional middle initial ("John K Diliberto") is allowed. All-caps
 *     ("EREN AKSOY"), all-lowercase ("playlistd"), digits, "&", "." and "'s"
 *     all fail
 *   - no word is an outlet/genre/function word ("Records", "Radio", "Music",
 *     "Lofi", "This", "Con", …)
 *   - the name is not the same as the curator's outlet (curators.playlist) —
 *     "Ron Murx" on a playlist called "Ron Murx" is a brand as far as we know
 */

const NON_PERSON_WORDS = new Set([
  // outlet / organisation
  'records', 'recordings', 'music', 'musica', 'música', 'radio', 'rádio', 'fm',
  'media', 'publishing', 'labs', 'lab', 'sound', 'sounds', 'network', 'networks',
  'playlist', 'playlists', 'selections', 'selects', 'collective', 'club', 'mag',
  'magazine', 'blog', 'studio', 'studios', 'crew', 'group', 'agency',
  'management', 'entertainment', 'productions', 'official', 'project', 'team',
  'channel', 'tv', 'press', 'zine', 'review', 'reviews', 'weekly', 'daily',
  'global', 'world', 'city', 'pulse', 'light', 'wave', 'waves', 'vibe', 'vibes',
  'station', 'live', 'session', 'sessions', 'hub', 'house', 'garden', 'paper',
  // genre
  'rap', 'hip', 'hop', 'jazz', 'lofi', 'chill', 'edm', 'pop', 'rock', 'indie',
  'soul', 'funk', 'beats', 'bangers', 'metal', 'punk', 'techno', 'ambient',
  'piano',
  // function words that mark a phrase, not a name
  'the', 'this', 'that', 'and', 'of', 'in', 'on', 'for', 'con', 'de', 'del',
  'la', 'le', 'les', 'el', 'los', 'las', 'da', 'do', 'des', 'du', 'my', 'your',
  'our', 'best', 'new', 'top',
]);

const NAME_WORD = /^\p{Lu}\p{Ll}+(?:[-'’]\p{Lu}?\p{Ll}+)?$/u;
const INITIAL = /^\p{Lu}\.?$/u;

function fold(s) {
  return (s || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * @param {{ name?: string|null, playlist?: string|null }} curator
 * @returns {string|null} the name to greet, or null for "Hi there,"
 */
export function greetingName(curator) {
  const name = (curator?.name || '').trim().replace(/\s+/g, ' ');
  if (!name) return null;

  const words = name.split(' ');
  if (words.length < 2 || words.length > 3) return null;

  const ok = words.every((w, i) => {
    if (NON_PERSON_WORDS.has(w.toLowerCase())) return false;
    if (NAME_WORD.test(w)) return true;
    // A middle initial only — never the first or last word.
    return i > 0 && i < words.length - 1 && INITIAL.test(w);
  });
  if (!ok) return null;

  if (curator?.playlist && fold(curator.playlist) === fold(name)) return null;

  return name;
}
