// How a profile save treats artists.bio_en (the English bio shown to curators
// in the pitch email's About section).
//
// - The artist edited the English text → store it and stamp bio_en_edited_at.
//   (If the text came from 「日本語から作り直す」 unchanged, it is machine text:
//   no stamp.)
// - Only the Japanese bio changed:
//     · English never hand-edited → re-translate, as before.
//     · English hand-edited (bio_en_edited_at set) → keep it, and tell the
//       artist the Japanese changed (the caller shows the notice).
//
// The dashboard posts the whole form on every save, so "sent" is not
// "changed": everything is compared with the stored row.
//
// Pure (no DB, no network) so it can be unit-tested.

export const BIO_EN_MAX = 2000;

const norm = (s) => (typeof s === 'string' ? s.trim() : '');

// body: the PATCH body. current: the stored artists row (select '*').
// hasEditedColumn: false until artists.bio_en_edited_at exists — then the
// stamp is never written (a missing column would fail the whole save).
// Returns { patch, regenerate, kept, error }.
export function decideBioEn({ body, current, now = new Date(), hasEditedColumn = true }) {
  const out = { patch: {}, regenerate: false, kept: false, error: null };
  if (!current) return out;
  const enSent = body.bio_en !== undefined && body.bio_en !== null;
  const enChanged = enSent && norm(body.bio_en) !== norm(current.bio_en);
  const bioChanged = body.bio !== undefined && norm(body.bio) !== norm(current.bio);

  if (enChanged) {
    const text = norm(body.bio_en);
    if (text.length > BIO_EN_MAX) {
      out.error = `英語版は${BIO_EN_MAX}文字以内にしてください`;
      return out;
    }
    out.patch.bio_en = text || null;
    if (hasEditedColumn) {
      const machine = body.bio_en_regenerated === true || !text;
      out.patch.bio_en_edited_at = machine ? null : now.toISOString();
    }
    return out;
  }
  if (bioChanged) {
    if (hasEditedColumn && current.bio_en_edited_at) out.kept = true;
    else out.regenerate = true;
  }
  return out;
}
