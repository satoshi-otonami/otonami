// How the AI pitch writes the artist's own name and label.
//
// The model used to romanize Japanese names on its own: the bio's 「デラ」 came
// out as "Dera" / "Dela" (the registered label is "Della"), and the sign-off —
// built from the logged-in user's name — gave 鳳レオ eight spellings ("Hou Leo",
// "Otori Leo", "Reo Ohtori", ...) while artists.name_en is "Reo Ootori". The
// registered forms (artists.name_en / name / label_name) are now handed to the
// prompt with a copy-exactly rule, and the sign-off is written by the server.
//
// Pure functions only (no DB, no network) so they can be unit-tested.

export const JA_NAME_RE = /[぀-ゟ゠-ヿ一-龯]/;
export const SIGN_OFF_TOKEN = '[[SIGN_OFF]]';
export const ARTIST_NAME_TOKEN = '[[ARTIST_NAME]]';

// Trim ASCII and full-width spaces at both ends, collapse inner runs to one.
export function cleanName(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/^[\s　]+|[\s　]+$/g, '').replace(/[\s　]+/g, ' ');
}

// row: the artists row (name, name_en, label_name) — the source of truth.
// form: the pitch form's artist ({ name, nameEn }) — only when the row is missing.
// Returns:
//   englishName  the form the prompt may write (null when only Japanese is registered)
//   signName     what the sign-off says: name_en, else the registered name as is
//   japaneseName the registered name when it contains Japanese, else null
//   label        the registered label_name, or null
export function resolveIdentity(row, form = {}) {
  const name = cleanName(row?.name) || cleanName(form?.name);
  const nameEn = cleanName(row?.name_en) || (row ? '' : cleanName(form?.nameEn));
  const label = cleanName(row?.label_name) || null;
  const nameIsJa = JA_NAME_RE.test(name);
  const englishName = nameEn || (name && !nameIsJa ? name : null);
  return {
    englishName,
    signName: englishName || name || null,
    japaneseName: nameIsJa ? name : null,
    label,
  };
}

// Prompt block placed in ARTIST PROFILE.
export function identityPromptBlock(identity) {
  const lines = ['REGISTERED NAMES (copy exactly — same spelling, capitalization and spacing; never romanize, translate or "correct" them):'];
  if (identity.englishName) {
    lines.push(`- Artist name: "${identity.englishName}". Whenever you write the artist's name (subject line, pitch, EPK), write exactly "${identity.englishName}".`);
  } else {
    lines.push(`- Artist name: no English form is registered. Do NOT write the artist's name in the subject line or the pitch — speak as "I". In the EPK bio, write ${ARTIST_NAME_TOKEN} wherever the name is needed; the platform fills it in.`);
  }
  if (identity.label) {
    const ja = JA_NAME_RE.test(identity.label);
    lines.push(ja
      ? `- Label: registered only in Japanese. Do NOT name the label; say "my label" if needed.`
      : `- Label: "${identity.label}". If you mention the label, write exactly "${identity.label}" — even where the bio spells it in Japanese.`);
  }
  lines.push('- Other names written in Japanese (bands, shows, people): use the English form given in the profile if there is one (e.g. "物乞い (Monogoi)" → Monogoi). Never leave Japanese characters in the output.');
  return lines.join('\n');
}

// Sign-off rule for PITCH STRUCTURE.
export function signOffRule() {
  return `6. Sign-off: after the closing invitation you may write a short closing word (e.g. "Best,"), then end the pitch with the line ${SIGN_OFF_TOKEN} exactly. Do NOT write the artist's name or "via OTONAMI" yourself — the platform replaces ${SIGN_OFF_TOKEN} with the registered name.`;
}

export function signatureText(signName) {
  return signName ? `${signName}\nvia OTONAMI` : 'via OTONAMI';
}

const NAME_LINE_RE = /^[^.!?]{1,60}$/; // a short line with no sentence punctuation

// Writes the server's sign-off into the pitch body: replaces SIGN_OFF_TOKEN,
// or — if the model ignored it — the model's own "<name> via OTONAMI" lines;
// appends it when neither is there.
export function applySignOff(pitchText, signName) {
  const sig = signatureText(signName);
  let text = String(pitchText || '').replace(/[ \t]+$/gm, '');
  if (text.includes(SIGN_OFF_TOKEN)) {
    let first = true;
    text = text.replace(/[ \t]*\[\[SIGN_OFF\]\][ \t]*/g, () => (first ? ((first = false), sig) : ''));
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }
  const lines = text.split('\n');
  let i = -1;
  for (let k = lines.length - 1; k >= 0; k--) if (/via OTONAMI/i.test(lines[k])) { i = k; break; }
  if (i >= 0) {
    const onlyVia = /^[\s(—–-]*via OTONAMI/i.test(lines[i]);
    let start = i;
    if (onlyVia) {
      let p = i - 1;
      while (p >= 0 && !lines[p].trim()) p--;
      if (p >= 0 && NAME_LINE_RE.test(lines[p].trim()) && !/[,:]$/.test(lines[p].trim())) start = p;
    }
    lines.splice(start, i - start + 1, ...sig.split('\n'));
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  return `${text.trim()}\n\n${sig}`;
}

// EPK: fill ARTIST_NAME_TOKEN with the registered name.
export function applyArtistName(text, signName) {
  return String(text || '').split(ARTIST_NAME_TOKEN).join(signName || 'the artist');
}
