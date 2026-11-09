import Anthropic from '@anthropic-ai/sdk';
import { anthropicRequestBase } from '@/lib/anthropic-model';

// 和文→英文の翻訳（アーティストの bio → artists.bio_en）。
//
// 背景: ピッチメールの「About the artist」に artists.bio がそのまま入り、
// 日本語 bio のアーティスト（65組中37組）は海外キュレーターに読めない
// 紹介文を送っていた（2026-11-09 メンテ棚卸し C-2）。送信のたびに訳すと
// メールごとに訳がゆれるので、プロフィール保存時に1回だけ訳して保存する。
// lib/translate-ja.js（キュレーター bio → bio_ja）の逆方向。
//
// 設計方針:
// - 失敗しても絶対に呼び出し元を落とさない（null を返し、送信側は
//   「日本語を含まない bio ならそのまま／含むなら About 節を出さない」）。
// - 原文に日本語が無ければ翻訳しない（null）。判定はかな・漢字のみ
//   （全角記号を含めると英文でも誤発動する。translate-ja.js と同じ理由）。
// - プロンプトは EPK 英訳と共通（固有名詞を補完しない・数を変えない規則入り、
//   1bea377 の Fuji Rock ケース）。

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

// ひらがな・カタカナ・漢字のみ（全角記号は含めない）
export const JA_RE = /[぀-ゟ゠-ヿ一-龯]/;

export const EN_TRANSLATE_SYSTEM_PROMPT =
  'You are a translator for a music EPK (electronic press kit). Translate the ' +
  'Japanese text into natural, industry-standard English for international playlist ' +
  'curators and music press. ' +
  'Proper nouns — band names, person names, song titles, festival names, label names, ' +
  'and place names. If an established English or romanized form already exists, keep it ' +
  'exactly as written (e.g. ROUTE14band, SXSW, Bay of Islands Jazz Festival); do not ' +
  'translate or re-spell it. If a name is written only in Japanese, transcribe it into ' +
  'Hepburn romaji, surname before given name (e.g. 山崎千裕 → Yamazaki Chihiro); never ' +
  'leave Japanese characters in the output, and never invent or reinterpret a spelling. ' +
  'When a proper noun already appears in English elsewhere in the text, match that form ' +
  'consistently. ' +
  'Do not make proper nouns more specific than the source — translate or romanize only ' +
  'what is written, and never supply an official name, stage name, venue, or place name ' +
  'that the source does not state. The "established English form" rule above applies ONLY ' +
  'to names the source actually writes; it never licenses you to upgrade a generic ' +
  'description into an official name. If the source describes something generically ' +
  '(a stage, a venue, a district), keep it generic in English. Example: a source that ' +
  'says only "the rookie stage at Fuji Rock" must stay "the rookie stage at Fuji Rock" — ' +
  "do not replace it with that stage's official name, even if you know it. " +
  'Preserve ALL numbers, counts, and years exactly as in the source ' +
  '(e.g. 「SXSWに10回」 → "ten times at SXSW" or "10 times"; never add, drop, or ' +
  'reinterpret a count). Do not introduce facts, opinions, or detail not present in ' +
  'the source. Keep the original third-person / editorial voice — do not switch to ' +
  'first person. A 1–2 sentence tagline must stay concise. ' +
  'Output ONLY the translated English text — no preamble, no quotation marks, no notes.';

// 訳文に残った日本語の後始末（2026-11-09 レビューで確定した規則）。
// 1. 日本語を含む括弧は括弧ごと消す。原文「蜷川べに（Ninagawa Beni）」が訳で
//    「Ninagawa Beni (蜷川べに)」に反転して漢字が残った。英字だけの括弧
//    （"(1/f fluctuation)"、"記録 (Kiroku)" のローマ字併記）には触らない。
// 2. 「日本語 / 英字」の併記は英字側だけ残す（Nyarons の
//    "ハルカカナタ / HARUKAKANATA" → "HARUKAKANATA"）。逆順も同じ。
const JA_CHARS = '぀-ゟ゠-ヿ一-龯';
const JA_PAREN_RE = new RegExp(`[ \\t\\u3000]*[（(][^（）()\\n]*[${JA_CHARS}][^（）()\\n]*[）)]`, 'g');
const JA_RUN = `[${JA_CHARS}](?:[${JA_CHARS} \\u3000]*[${JA_CHARS}])?`;
const JA_THEN_EN_RE = new RegExp(`${JA_RUN}[ \\u3000]*[/／][ \\u3000]*(?=[A-Za-z0-9])`, 'g');
const EN_THEN_JA_RE = new RegExp(`(?<=[A-Za-z0-9!?.)])[ \\u3000]*[/／][ \\u3000]*${JA_RUN}`, 'g');

export function cleanJapaneseResidue(text) {
  return String(text)
    .replace(JA_PAREN_RE, '')
    .replace(JA_THEN_EN_RE, '')
    .replace(EN_THEN_JA_RE, '')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

// 曲名の扱い（共通プロンプトの「日本語を残さない」の、曲名だけの例外）。
// 公式の英字表記が原文にあればそれだけ、無ければ日本語表記＋ローマ字の括弧併記。
const SONG_TITLE_RULE =
  ' Song titles are the one exception to "never leave Japanese characters": if the ' +
  'source gives a song title in both Japanese and English/romaji (e.g. 「ハルカカナタ / ' +
  'HARUKAKANATA」), write only the English/romaji form (HARUKAKANATA). If a song title ' +
  'appears only in Japanese, keep the Japanese title and add its Hepburn romaji in ' +
  'parentheses right after it, every time it appears (e.g. 記録 → 記録 (Kiroku)).';

// bio → 英訳。nameEn があれば、本文中のアーティスト自身の名前をその表記に揃える
// （name_en と bio_en で同じ人のローマ字がずれるのを防ぐ）。labelName も同様
// （デラ → "Dela" と誤ローマ字化された。正しくは artists.label_name の "Della"）。
// 日本語 bio は性別を書かないことが多いので、書かれていなければ代名詞を付けない
// （サンプルで蜷川べにが根拠なく "she" にされた）。
export async function translateBioToEnglish(text, { name, nameEn, labelName } = {}) {
  if (!text || !String(text).trim()) return null;
  const source = String(text);
  if (!JA_RE.test(source)) return null; // no Japanese — use the bio as-is

  let system = EN_TRANSLATE_SYSTEM_PROMPT;
  if (name && nameEn && name.trim() !== nameEn.trim()) {
    system += ` The artist this text is about is "${name.trim()}"; write that name ` +
      `exactly as "${nameEn.trim()}" wherever it appears.`;
  }
  if (labelName && !JA_RE.test(labelName)) {
    system += ` The artist's label is written in English as "${labelName.trim()}"; if the ` +
      'text refers to that label in Japanese, use exactly that form.';
  }
  system += SONG_TITLE_RULE;
  system += ' The source usually does not state the artist\'s gender: unless it does, do not ' +
    'use he/she/his/her for the artist — repeat the name, use "they", or restructure the sentence.';

  try {
    const response = await anthropic.messages.create({
      ...anthropicRequestBase('bioTranslate'),
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: source }],
    });
    const out = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!out || response.stop_reason === 'max_tokens') {
      console.warn('[translate-en] bio translation empty or truncated (non-fatal):', response.stop_reason);
      return null;
    }
    return cleanJapaneseResidue(out) || null;
  } catch (e) {
    console.warn('[translate-en] bio translation failed (non-fatal):', e?.message);
    return null;
  }
}

// artists.bio_en to store alongside a profile write. `fields` is what is being
// written (bio, and name / label_name when they change too); `current` is the
// stored row, or null on insert. Returns undefined when bio is not being
// changed — the dashboard posts the whole form on every save, so an unchanged
// bio must not be retranslated (it would cost a call and replace a reviewed
// translation). A cleared bio, or one with no Japanese, stores null: the pitch
// email then falls back to the bio itself (app/api/email).
export async function bioEnForSave(fields, current = null) {
  if (fields.bio === undefined) return undefined;
  const next = fields.bio ? String(fields.bio) : '';
  if (current && (current.bio || '').trim() === next.trim()) return undefined;
  if (!next.trim()) return null;
  return translateBioToEnglish(next, {
    name: fields.name ?? current?.name,
    nameEn: current?.name_en,
    labelName: fields.label_name ?? current?.label_name,
  });
}
