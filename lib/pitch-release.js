// How the AI pitch may describe the key track's release ("new", "latest", ...).
//
// The model used to open every pitch with "share my new track" — copied from
// the opener example in lib/pitch-prompt.js — whatever the release date: a 2012
// album track went out as "My new track", and a June single went out as "my
// latest lo-fi release" after six later singles. The release date is now looked
// up server-side and turned into a fixed instruction (releasePromptBlock), and
// the output is checked (findReleaseClaims). If a retry still makes the claim,
// the offending sentences are replaced with a fixed neutral opener
// (neutralizeReleaseClaims) instead of having words cut out of them.
//
// Pure functions only (no DB, no network) so they can be unit-tested.

export const RECENT_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

// Today's date in Japan as YYYY-MM-DD (release dates are entered as JST dates).
export function todayJst(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isIsoDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

// UNKNOWN: no usable date. UPCOMING: after today. RECENT: within RECENT_DAYS.
// OLDER: anything before that.
export function releaseStatus(releaseDate, today) {
  if (!isIsoDate(releaseDate) || !isIsoDate(today)) return { cls: 'UNKNOWN' };
  const days = Math.round((Date.parse(today) - Date.parse(releaseDate)) / DAY_MS);
  if (days < 0) return { cls: 'UPCOMING', days, releaseDate };
  if (days <= RECENT_DAYS) return { cls: 'RECENT', days, releaseDate };
  return { cls: 'OLDER', days, releaseDate };
}

const BANNED_WORDS =
  '"new", "newest", "latest", "most recent", "recent", "fresh", "brand-new", "just released", "just dropped", "out now", or "debut"';

// Instruction placed right after the "Key Track:" line of the prompt.
export function releasePromptBlock(title, status, today) {
  const head = `KEY TRACK RELEASE STATUS (decided by the platform from the registered release date — follow it exactly; today is ${today}):`;
  const neutral =
    'Introduce the Key Track neutrally — for example "a track of mine" or "one of my songs" — and do not say or imply how old or how recent it is: no release year, no release date, no "back in", no "from my catalog", no "older", no "classic".';
  const ban = `Do NOT describe the Key Track as ${BANNED_WORDS}, and do not imply it is my most recent work.`;
  const exception =
    'Only exception: if the artist\'s own Description for this submission explicitly calls this track new or latest, you may say so.';
  switch (status.cls) {
    case 'RECENT':
      return `${head}\n"${title}" was released ${status.days} day(s) ago. You may call it "new" (e.g. "my new single"). Do NOT call it "latest", "newest" or "most recent" — the platform cannot confirm nothing has been released since. ${exception}`;
    case 'UPCOMING':
      return `${head}\n"${title}" is scheduled for release on ${status.releaseDate}. Describe it as upcoming or "out on ${status.releaseDate}"; never as already released, "out now" or "just released".`;
    case 'OLDER':
      return `${head}\n"${title}" is not a new release. ${ban} ${neutral} ${exception}`;
    default:
      return `${head}\nThe release date of "${title}" is unknown. ${ban} ${neutral} ${exception}`;
  }
}

// Three opener examples for rule 5 of the prompt, with an instruction not to
// copy them, so pitches do not all start with the same sentence.
export const OPENER_EXAMPLES = [
  `"Hi [Curator Name], I'm reaching out from Japan to share a track of mine, "<title>"…"`,
  `"Hi [Curator Name], I'd love for you to hear one of my songs, "<title>"…"`,
  `"Hi [Curator Name], I make <genre> in <city or country>, and I wanted to send you "<title>"…"`,
];

export function openerRule() {
  return `5. CORRECT opening style (first person, natural). Examples of the shape only — do NOT copy any of them word for word; write your own opening in the same spirit:\n   ${OPENER_EXAMPLES.join('\n   ')}\n   Whether the track may be called new is decided ONLY by KEY TRACK RELEASE STATUS below.`;
}

// ── Output check ──

const TRACK_NOUN = '(?:track|single|song|release|ep|tune|piece|record|cut|instrumental|work)';
const NEW_ADJ = new RegExp(`\\b(?:brand[- ]new|new|newest|latest|most recent|recent|fresh)\\s+(?:[\\w'’\\-]+\\s+){0,3}?${TRACK_NOUN}s?\\b`, 'i');
const LATEST_ADJ = new RegExp(`\\b(?:latest|newest|most recent)\\s+(?:[\\w'’\\-]+\\s+){0,3}?${TRACK_NOUN}s?\\b|\\b(?:my|our) latest\\b`, 'i');
const JUST_OUT = /\b(?:just (?:released|dropped|came out|put out)|out now|now out)\b/i;
const DEBUT = new RegExp(`\\bdebut\\s+(?:[\\w'’\\-]+\\s+){0,2}?${TRACK_NOUN}s?\\b`, 'i');
const RELEASE_AGE = /\b(?:released|came out|put out|originally released|first released)\b[^.!?]{0,30}\b(?:19|20)\d{2}\b|\bback in (?:19|20)\d{2}\b|\bfrom (?:19|20)\d{2}\b|\bfrom my (?:back )?catalog(?:ue)?\b/i;

export function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?]["”’)]?)\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Sentences of the pitch body (no Subject/greeting/signature) that break the
// release rule for the given status. Returns [] when the text is fine.
export function findReleaseClaims(pitchText, status) {
  const cls = status?.cls || 'UNKNOWN';
  const out = [];
  for (const s of splitSentences(pitchText)) {
    if (/^subject:/i.test(s) || /^(hi|hello|dear)\b[^.!?]*,$/i.test(s)) continue;
    let bad = false;
    if (cls === 'OLDER' || cls === 'UNKNOWN') {
      bad = NEW_ADJ.test(s) || JUST_OUT.test(s) || DEBUT.test(s) || RELEASE_AGE.test(s);
    } else if (cls === 'RECENT') {
      bad = LATEST_ADJ.test(s);
    } else if (cls === 'UPCOMING') {
      bad = JUST_OUT.test(s) || LATEST_ADJ.test(s);
    }
    if (bad) out.push(s);
  }
  return out;
}

export function neutralOpener(title) {
  return title
    ? `I'm reaching out from Japan to share a track of mine, "${title}".`
    : "I'm reaching out from Japan to share a track of mine.";
}

// First sentence of the pitch body: skips the "Subject:" line and the greeting
// line ("Hi [Curator Name],").
export function firstBodySentence(pitchText) {
  return splitSentences(pitchText).find(
    (s) => !/^subject:/i.test(s) && !/^(hi|hello|dear)\b[^.!?]*,$/i.test(s)
  ) || null;
}

// Last resort after a retry: the opening sentence of the body is replaced with
// the fixed neutral opener, and every other offending sentence is dropped whole
// (no word-level cutting). Subject line, greeting, signature and the rest stay
// as written.
export function neutralizeReleaseClaims(pitchText, claims, title) {
  if (!claims.length) return pitchText;
  let text = String(pitchText);
  const opening = firstBodySentence(text);
  for (const sentence of claims) {
    if (sentence === opening) continue;
    const at = text.indexOf(sentence);
    if (at >= 0) text = text.slice(0, at) + text.slice(at + sentence.length);
  }
  if (opening) {
    const at = text.indexOf(opening);
    if (at >= 0) text = text.slice(0, at) + neutralOpener(title) + text.slice(at + opening.length);
  }
  return text.replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
