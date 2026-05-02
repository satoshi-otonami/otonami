/**
 * 文字列の長さを検証。超過時はエラーメッセージを返す（OKならnull）。
 */
export function validateLength(value, maxLength, fieldName) {
  if (typeof value !== 'string') return null;
  if (value.length > maxLength) {
    return `${fieldName}は${maxLength}文字以内で入力してください（現在${value.length}文字）`;
  }
  return null;
}

/**
 * 複数フィールドを一括検証。最初に見つかったエラーを返す（OKならnull）。
 */
export function validateAllLengths(fields) {
  for (const { value, max, name } of fields) {
    const err = validateLength(value, max, name);
    if (err) return err;
  }
  return null;
}

export const INPUT_LIMITS = {
  ARTIST_DESCRIPTION: 3000,
  ARTIST_INFLUENCES: 500,
  ARTIST_ACHIEVEMENTS: 2000,
  PITCH_BODY: 8000,
  PROMO_BIO: 2000,
  TRANSLATE_TEXT: 8000,
  TRACK_NAME: 200,
  ARTIST_NAME: 200,
  GENRE: 100,
};
