/**
 * Keeps song titles out of the send-time English translation
 * (ensureEnglishPitch in app/api/pitches/route.js).
 *
 * A Japanese track title is the one piece of Japanese a pitch should keep —
 * "悲しみがとまらない - lofi" is the song's real name, and it is what the
 * curator will search for. But ensureEnglishPitch translates whenever any
 * Japanese is present, and its retry pass orders "remove ALL Japanese", so a
 * Japanese title was always romanized or translated away. (The Della pilot,
 * 2026-10-27, had to bypass the check by hand for exactly this.)
 *
 * protectTitles() swaps each occurrence of a title for an ASCII token before
 * the Japanese check and the translation; restoreTitles() swaps them back
 * after. If the only Japanese in the body was the title, the check now sees
 * none and the translation is skipped altogether.
 *
 * Matching tolerates whitespace differences (a title stored with a full-width
 * space "いのちの名前　「…」より" appears with an ASCII space in AI output), and
 * also protects the title's leading segment ("いのちの名前" from
 * "いのちの名前　「千と千尋の神隠し」より", "悲しみがとまらない" from
 * "悲しみがとまらない - lofi") since the model often quotes only that part.
 */

const JAPANESE_RE = /[぀-ゟ゠-ヿ一-龯]/;

// Token is plain ASCII so it can neither trip the Japanese check nor be
// "translated"; the brackets make it unlikely to collide with prose.
const token = (i) => `[[TITLE_${i}]]`;
const TOKEN_RE = /\[\[TITLE_(\d+)\]\]/g;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whitespace runs (ASCII or full-width) in the title match any whitespace run.
function titlePattern(title) {
  return title
    .trim()
    .split(/[\s　]+/)
    .map(escapeRegExp)
    .join('[\\s\\u3000]+');
}

// The full title plus its leading segment, longest first, Japanese-bearing
// variants only (an ASCII title needs no protection).
function variants(title) {
  const t = (title || '').trim();
  if (!t || !JAPANESE_RE.test(t)) return [];
  const out = [t];
  const lead = t.split(/\s+-\s+|[\s　]*[「『(（\[【]/)[0].trim();
  if (lead && lead !== t && lead.length >= 2 && JAPANESE_RE.test(lead)) out.push(lead);
  return out;
}

/**
 * @param {string} text
 * @param {string[]} titles
 * @returns {{ text: string, saved: string[] }} saved[i] is the original
 *   (exact, as it appeared) text behind token i
 */
export function protectTitles(text, titles) {
  const saved = [];
  if (!text) return { text, saved };
  const all = [...new Set((titles || []).flatMap(variants))].sort((a, b) => b.length - a.length);
  let out = text;
  for (const v of all) {
    out = out.replace(new RegExp(titlePattern(v), 'g'), (m) => {
      saved.push(m);
      return token(saved.length - 1);
    });
  }
  return { text: out, saved };
}

/**
 * @returns {{ text: string, missing: number }} missing = tokens the
 *   translation dropped (their titles cannot be put back)
 */
export function restoreTitles(text, saved) {
  if (!text || !saved?.length) return { text, missing: 0 };
  const seen = new Set();
  const out = text.replace(TOKEN_RE, (m, i) => {
    const original = saved[Number(i)];
    if (original === undefined) return m;
    seen.add(Number(i));
    return original;
  });
  return { text: out, missing: saved.length - seen.size };
}
