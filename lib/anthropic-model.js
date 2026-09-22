// Anthropic モデルIDの唯一の出所。
//
// 経緯: モデルIDは9箇所にハードコードされていて、モデルを入れ替えるたびに
// 全ファイルを sed で置換していた（.claude/settings.local.json に当時の
// 一括置換コマンドが残っている）。置換漏れが起きても静かに古いモデルを
// 呼び続けるだけでエラーにならないため、ここに集約する。
//
// 使い方:
//   import { getModel } from '@/lib/anthropic-model';
//   model: getModel('pitch')
//
// 解決順（先に見つかったものが勝つ）:
//   1. 用途別の環境変数（例 ANTHROPIC_MODEL_PITCH）
//   2. 全体デフォルトの環境変数 ANTHROPIC_MODEL
//   3. DEFAULT_MODEL
//
// 用途別オーバーライドは、1箇所だけ別モデルで試したいとき（コスト調整や
// 品質切り分け）にコードを触らず Vercel の環境変数だけで切り替えるための
// 逃し弁。通常運用では ANTHROPIC_MODEL だけを設定する。

const DEFAULT_MODEL = 'claude-sonnet-5';

// 用途キー → 用途別オーバーライドの環境変数名。
// ここに載っていないキーを渡すのは呼び出し側のタイポなので、握りつぶさず投げる。
const OVERRIDE_ENV = {
  // ピッチ生成（AIモード）— app/api/pitch/route.js
  pitch: 'ANTHROPIC_MODEL_PITCH',
  // 生成後のピッチ和文→英訳 — app/api/pitch/translate/route.js
  pitchTranslate: 'ANTHROPIC_MODEL_PITCH_TRANSLATE',
  // 送信時のピッチ英訳（キュレーターが読む本文・無レビュー） — app/api/pitches/route.js
  pitchSend: 'ANTHROPIC_MODEL_PITCH_SEND',
  // EPK各フィールドの英訳 — app/api/epk/translate/route.js
  epkTranslate: 'ANTHROPIC_MODEL_EPK_TRANSLATE',
  // 汎用和英翻訳（Templateピッチの前処理） — app/api/translate/route.js
  translate: 'ANTHROPIC_MODEL_TRANSLATE',
  // プロモ用SNSキャプション生成 — app/api/promo/caption/route.js
  promoCaption: 'ANTHROPIC_MODEL_PROMO_CAPTION',
  // SNS自動キュレーター紹介の下書き — lib/sns-intro-caption.js
  snsIntro: 'ANTHROPIC_MODEL_SNS_INTRO',
  // リリックビデオ背景の DALL-E 用プロンプト生成 — app/api/lyric-video/generate-background/route.js
  lyricVideoPrompt: 'ANTHROPIC_MODEL_LYRIC_VIDEO_PROMPT',
};

// 環境変数の末尾に改行が混ざると、モデルIDが "claude-sonnet-5\n" になって
// Anthropic 側が 404 model_not_found を返す。NEXT_PUBLIC_APP_URL で同じ事故を
// やっているので（末尾 \n で検証リンクが全滅した）、ここでは必ず trim する。
function readEnv(name) {
  const raw = process.env[name];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getModel(useCase) {
  const overrideVar = OVERRIDE_ENV[useCase];
  if (!overrideVar) {
    throw new Error(
      `getModel: unknown use case "${useCase}". Known: ${Object.keys(OVERRIDE_ENV).join(', ')}`
    );
  }
  return readEnv(overrideVar) || readEnv('ANTHROPIC_MODEL') || DEFAULT_MODEL;
}

// ── thinking ──
// Sonnet 5 / Opus 4.7 以降は thinking を省略すると adaptive（思考オン）が既定で
// 走り、思考トークンが max_tokens を食う。旧 sonnet-4-6 前提で詰めてある
// max_tokens（ピッチ生成 1200 / EPKタグライン 300 など）のままだと、
// 思考だけで枠を使い切って本文ゼロ・stop_reason=max_tokens で返る。
// 実測（2026-09-22, ピッチ生成の TONE LOCK ケース）:
//   adaptive + max_tokens 1200 → stop_reason=max_tokens, 本文途中切れ・EPK欠落
//   adaptive + max_tokens 4000 → 正常だが 1815tok / 20.8秒
//   thinking 無効 + max_tokens 1200 → 正常 605tok / 13.3秒
// ここの用途はどれも短文生成・翻訳でツール呼び出しも無く、旧モデルでは
// そもそも思考なしで回っていた。挙動を変えないことを優先して既定は無効。
// 思考を試したいときは ANTHROPIC_THINKING=adaptive にして、あわせて各呼び出し
// 箇所の max_tokens を引き上げること（無効のままなら現行値で足りる）。
const DEFAULT_THINKING = 'disabled';

function thinkingConfig() {
  const mode = readEnv('ANTHROPIC_THINKING') || DEFAULT_THINKING;
  if (mode === 'adaptive') return { thinking: { type: 'adaptive' } };
  if (mode === 'disabled') return { thinking: { type: 'disabled' } };
  throw new Error(`ANTHROPIC_THINKING must be "adaptive" or "disabled", got "${mode}"`);
}

// 全呼び出し箇所で spread して使う共通部分。model と thinking を1箇所で決める。
//   const message = await client.messages.create({
//     ...anthropicRequestBase('pitch'),
//     max_tokens: 1200,
//     messages: [...],
//   });
export function anthropicRequestBase(useCase) {
  return { model: getModel(useCase), ...thinkingConfig() };
}

export { DEFAULT_MODEL, DEFAULT_THINKING, OVERRIDE_ENV };
