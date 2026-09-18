/**
 * 文字列の長さを検証。超過時はエラーメッセージを返す（OKならnull）。
 *
 * formatMessage(length, maxLength) を渡すと既定文言を差し替えられる。既定文言
 * （「〜は N 文字以内で入力してください」）が実態に合わないフィールド——たとえば
 * 複数の値を連結した1本の文字列——のための逃げ道で、渡さなければ従来どおり。
 */
export function validateLength(value, maxLength, fieldName, formatMessage) {
  if (typeof value !== 'string') return null;
  if (value.length > maxLength) {
    return typeof formatMessage === 'function'
      ? formatMessage(value.length, maxLength)
      : `${fieldName}は${maxLength}文字以内で入力してください（現在${value.length}文字）`;
  }
  return null;
}

/**
 * 複数フィールドを一括検証。最初に見つかったエラーを返す（OKならnull）。
 */
export function validateAllLengths(fields) {
  for (const { value, max, name, message } of fields) {
    const err = validateLength(value, max, name, message);
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
