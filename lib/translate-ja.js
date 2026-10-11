import Anthropic from '@anthropic-ai/sdk';
import { anthropicRequestBase } from '@/lib/anthropic-model';

// 英文→和文の表示用翻訳（キュレーターのフィードバック・紹介文）。
//
// 背景: 日本のアーティストにはフィードバックが英語のままだと読み飛ばされ、
// 「WAVを送れば放送に乗る」級のアクションが機会損失になる（2026/10/11、
// ROUTE14band宛フィードバック5件で顕在化。クリムゾン西村さんからも
// 紹介文の英語表示に同趣旨の指摘あり 2026/9/18）。
//
// 設計方針:
// - 失敗しても絶対に呼び出し元を落とさない（null を返し、表示側は原文に
//   フォールバック）。翻訳はあくまで付加情報。
// - 原文がすでに日本語なら翻訳しない（null）。判定はかな・漢字のみ。
//   全角記号(！-～)を含めると英文でも誤発動するため含めない
//   （app/api/pitches の JAPANESE_RE で確認済みの既知の落とし穴）。

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ひらがな・カタカナ・漢字のみ（全角記号は含めない）
const JA_RE = /[぀-ゟ゠-ヿ一-龯]/;

export async function translateToJapanese(text, context = 'text') {
  if (!text || !String(text).trim()) return null;
  const source = String(text);
  if (JA_RE.test(source)) return null; // already Japanese

  try {
    const response = await anthropic.messages.create({
      ...anthropicRequestBase('translateJa'),
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a professional translator for the music industry. Translate the following message into natural, polite Japanese for a Japanese independent artist.

STRICT RULES:
1. Preserve artist names, track titles, playlist names, and URLs exactly as-is (do not translate or transliterate them).
2. Keep the meaning complete — do not omit practical details (file formats, dates, deadlines, requests).
3. Natural Japanese, neither stiff nor overly casual (です・ます調).
4. Return ONLY the Japanese translation. No explanations, no markdown, no quotes.

Message:
${source}`,
      }],
    });
    const out = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return out || null;
  } catch (e) {
    console.warn(`[translate-ja] ${context} translation failed (non-fatal):`, e?.message);
    return null;
  }
}
