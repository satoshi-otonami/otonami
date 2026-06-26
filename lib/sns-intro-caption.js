// lib/sns-intro-caption.js
// SNS自動キュレーター紹介 Phase 2a: Claude APIで5媒体ぶんの紹介キャプションを1回で生成。
// X / Instagram / Threads / Facebook / LinkedIn。JSONのみ返すよう厳命し安全にparse。

import Anthropic from '@anthropic-ai/sdk';

// 渡されたフィールド以外を創作させないため、事実は curator の許可フィールドだけを埋め込む。
// accepts（ジャンル）は空のことがあるので「値があるときだけ」プロンプトに含める。
function buildFactBlock(curator) {
  const lines = [
    `name: ${curator.name}`,
    curator.platform ? `platform (媒体名): ${curator.platform}` : null,
    curator.region ? `region: ${curator.region}` : null,
    curator.type ? `type: ${curator.type}` : null,
    (curator.opportunities && curator.opportunities.length)
      ? `opportunities (提供できる機会): ${curator.opportunities.join(', ')}`
      : null,
    // accepts は値があるときだけ。空なら行ごと出さない＝言及禁止が自然に効く。
    (curator.accepts && curator.accepts.length)
      ? `accepts (対応ジャンル): ${curator.accepts.join(', ')}`
      : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildSnsIntroPrompt(curator) {
  const facts = buildFactBlock(curator);
  return `あなたはOTONAMIのSNS運用担当です。OTONAMIは、日本のインディーアーティストと海外のキュレーター（プレイリスト編集者・音楽ブロガー・ラジオDJ・レーベル）をつなぐ音楽ピッチサービスです。
新しく参加してくれたキュレーターを、OTONAMIの公式SNSで「紹介」する投稿文を作成します。

# 紹介するキュレーターの確定情報（これ以外の事実は一切使わない・創作しない）
${facts}

# ブランドルール（例外なし・厳守）
- 絵文字は一切使わない。
- ハッシュタグは「5媒体すべて合計で5個まで」。1個も使わなくてよい。多用しない。
- トーン: 柔らかい語尾で、煽らない。自己啓発調・誇張・過度な感嘆をしない。落ち着いた紹介文。
- ILCJとOTONAMIは別法人。OTONAMIをILCJの事業として書かない。ILCJに言及しない。
- 数字は上に渡した確定情報にある値だけ使う。人数・期間・実績などの不確かな数字や推測は書かない。
- 言語は日本語を主体にする。ただしキュレーター名・媒体名(platform)・regionは原語表記のまま変えない。
- 上の確定情報フィールド（name / platform / region / type / opportunities / accepts）にある事実だけを使う。それ以外の属性を足さない。
- accepts（ジャンル）は確定情報に無ければ一切触れない（ジャンルを推測して書かない）。
- 各媒体の長さの目安: X=短め・リンク1本前提 / Instagram=やや長め / Threads=会話的 / Facebook=標準 / LinkedIn=ややフォーマル。

# 追加ルール（最終・最優先で厳守）
- ターゲット表記は「日本・アジアのアーティスト」で統一する。「インディー」「インディーズ」など対象を限定する語は使わない。
- 全文を敬体（です・ます）で統一する。「〜できますよ」「〜ですよ」のような砕けた・投げやりな語尾は使わない。丁寧さを保ちつつ柔らかいトーンにする（馴れ馴れしくしない）。
- 読者にはOTONAMIをまだ知らない・登録していないアーティストも含まれる前提で書く。各キャプションに「OTONAMIが何か」が初見でも伝わる一文を必ず入れる（OTONAMIは、日本・アジアのアーティストと海外のキュレーターをつなぐ音楽ピッチサービス）。「ピッチしてください」のように登録済みだけを前提にした締めにしない。
- 導線URLは各キャプションに「https://otonami.io」をちょうど1回含める（トップページ）。/studio などログイン必須のURLは使わない。

# 出力形式
次のキーだけを持つ有効なJSONのみを返す。前後の説明・マークダウン・バッククォートは付けない。
{"x": "...", "instagram": "...", "threads": "...", "facebook": "...", "linkedin": "..."}`;
}

// JSONのみ返す想定。バッククォートや前後テキストが混じっても安全に取り出す。
function parseCaptionsJson(text) {
  let t = (text || '').trim();
  t = t.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  // 最初の { から最後の } までを抽出（前後にテキストが付いた場合の保険）
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  const obj = JSON.parse(t);
  const out = {};
  for (const k of ['x', 'instagram', 'threads', 'facebook', 'linkedin']) {
    out[k] = typeof obj[k] === 'string' ? obj[k].trim() : '';
  }
  return out;
}

// ブランドルール「ハッシュタグは全媒体合計でmax個まで」を決定論的に強制する。
// 生成モデルが超過することがあるため、出現順に先頭max個だけ残し、残りのタグを除去して整形。
export function enforceHashtagCap(captions, max = 5) {
  const order = ['x', 'instagram', 'threads', 'facebook', 'linkedin'];
  const out = { ...captions };
  let kept = 0;
  for (const k of order) {
    let text = out[k] || '';
    text = text.replace(/#[^\s#　]+/g, (tag) => {
      if (kept < max) { kept++; return tag; }
      return ''; // 上限超過分のハッシュタグを削除
    });
    // 削除後の余分な空白・空行を整える
    text = text
      .replace(/[ \t　]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t　]{2,}/g, ' ')
      .replace(/[ \t　]+$/gm, '')
      .trim();
    out[k] = text;
  }
  return out;
}

// 検証用: 絵文字の有無とハッシュタグ総数を数える（証明・ガード用）。
export function auditCaptions(captions) {
  const all = Object.values(captions).join('\n');
  // 拡張ピクトグラフィック（絵文字）の検出。
  const emojiRe = /\p{Extended_Pictographic}/u;
  const hasEmoji = emojiRe.test(all);
  const hashtagMatches = all.match(/#[^\s#　]+/g) || [];
  return {
    hasEmoji,
    hashtagCount: hashtagMatches.length,
    hashtags: hashtagMatches,
  };
}

export async function generateSnsIntroCaptions(curator) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const client = new Anthropic({ apiKey });
  const prompt = buildSnsIntroPrompt(curator);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content?.[0]?.text || '';
  const raw = parseCaptionsJson(text);
  // ブランドルールを決定論的に強制（ハッシュタグ合計5個まで）。
  const captions = enforceHashtagCap(raw, 5);
  const audit = auditCaptions(captions);
  return { captions, audit };
}
