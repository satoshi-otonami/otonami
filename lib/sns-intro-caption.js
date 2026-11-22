// lib/sns-intro-caption.js
// SNS自動キュレーター紹介 Phase 2a: Claude APIで5媒体ぶんの紹介キャプションを1回で生成。
// X / Instagram / Threads / Facebook / LinkedIn。JSONのみ返すよう厳命し安全にparse。
// 本文は LLM、ハッシュタグ・メンション・名前の絵文字除去はコード側で決定論的に行う（11/16）。

import Anthropic from '@anthropic-ai/sdk';
import { anthropicRequestBase } from '@/lib/anthropic-model';

// 訴求に使うジャンル/ムードは長い配列のことがある（例: 9ジャンル）。プロンプトには
// 先頭数件だけ渡してカードと整合させ、全列挙を防ぐ。件数は後で調整できるよう定数化。
// カード側（lib/sns-intro-card.jsx）と同値に揃える。
const MAX_GENRES = 3;
const MAX_MOODS = 2;

export const PLATFORM_ORDER = ['x', 'instagram', 'threads', 'facebook', 'linkedin'];

// ── ハッシュタグ ─────────────────────────────────────────────
// タグは LLM に作らせず、ここの対応表から決定論的に組み立てる。
// 媒体ごとの上限（Instagram は 2025年12月から1投稿5個まで、Threads は1投稿1タグ）。
export const HASHTAG_LIMITS = { x: 2, instagram: 5, threads: 1, facebook: 2, linkedin: 3 };

// 固定タグ。
export const BRAND_HASHTAG = '#OTONAMI';

// 対象読者（日本のアーティスト）向けの日本語タグ。差し替えはこの配列だけでよい（先頭から優先して使う）。
// 「インディーズ」は本文ルール（対象を限定する語を使わない）とぶつかるので使わない（11/16 山下さん決定）。
export const AUDIENCE_HASHTAGS = ['#海外プロモーション', '#音楽プロモーション'];

// 媒体ごとの優先順の上書き（11/16 山下さん決定）。
// - Threads は1投稿1タグなので、#OTONAMI ではなく読者向けタグの先頭（#海外プロモーション）
// - X は文字数が厳しいので2個だけ（#海外プロモーション #OTONAMI）。超過時は末尾から外す
const PLATFORM_FIRST_TAGS = {
  threads: () => [AUDIENCE_HASHTAGS[0]],
  x: () => [AUDIENCE_HASHTAGS[0], BRAND_HASHTAG],
};

// X の文字数上限（日本語など全角1文字=2、URL=23 で数える。Premium でないアカウントの上限）。
export const X_MAX_WEIGHTED = 280;
// プロンプトで縛る X 本文の長さ（タグ・@・URL を除く全角換算。下の説明文を含めた長さ）。
export const X_BODY_MAX_ZENKAKU = 90;

// OTONAMI の説明文。モデルには書かせず、コードで各キャプションの最後（URLの直前）に差し込む。
// 文言は従来プロンプトが指定していた説明（OTONAMIは、日本・アジアのアーティストと海外の
// キュレーターをつなぐ音楽ピッチサービス）に文末の「です。」を付けただけ（11/22 山下さん決定）。
export const OTONAMI_SENTENCE = 'OTONAMIは、日本・アジアのアーティストと海外のキュレーターをつなぐ音楽ピッチサービスです。';
export const CTA_URL = 'https://otonami.io';

// curators.genres の値 → タグ。& ・空白・記号を含む値は安全な形にしてある。
// ここに無いジャンルはタグにしない。
export const GENRE_HASHTAGS = {
  'Lo-fi': '#LoFi',
  'Instrumental': '#Instrumental',
  'Hip-hop': '#HipHop',
  'Electronic': '#ElectronicMusic',
  'Singer-Songwriter': '#SingerSongwriter',
  'Trap': '#Trap',
  'Rap': '#Rap',
  'Classical': '#ClassicalMusic',
  'Indie': '#IndieMusic',
  'Folk': '#FolkMusic',
  'Alternative': '#AlternativeMusic',
  'R&B': '#RnB',
  'Jazz': '#Jazz',
  'Funk': '#Funk',
  'Soul': '#SoulMusic',
  'Dance music': '#DanceMusic',
  'Disco': '#Disco',
  'J-Pop': '#JPop',
  'City Pop': '#CityPop',
  'J-Rock': '#JRock',
  'Rock': '#RockMusic',
  'Pop': '#PopMusic',
  'Reggae': '#Reggae',
  'World music': '#WorldMusic',
  'Latin': '#LatinMusic',
  'Jazz fusion': '#JazzFusion',
  'Film music': '#FilmMusic',
  'Experimental': '#ExperimentalMusic',
  'Ambient': '#AmbientMusic',
  'Metal': '#Metal',
  'Punk': '#Punk',
};

// curators.type → タグ。対応表にある種別だけ。
export const TYPE_HASHTAGS = {
  radio: '#ラジオ',
  playlist: '#プレイリスト',
  label: '#音楽レーベル',
  blog: '#音楽ブログ',
  media: '#音楽メディア',
};

// 文字・数字・アンダースコアだけのタグを通す（& や - や空白で切れるタグを出さない）。
const SAFE_TAG_RE = /^#[\p{L}\p{N}_]+$/u;

function genreTagsOf(curator) {
  const out = [];
  for (const g of curator.genres || []) {
    const t = GENRE_HASHTAGS[g];
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= MAX_GENRES) break;
  }
  return out;
}

// 媒体ごとのタグ列。優先順に並べ、同じ媒体内の重複を除いて上限で切る。
// 媒体をまたぐ重複は許す。
export function buildHashtags(curator) {
  const genres = genreTagsOf(curator);
  const typeTag = TYPE_HASHTAGS[curator.type] || null;
  const priority = [
    BRAND_HASHTAG,
    genres[0],
    AUDIENCE_HASHTAGS[0],
    typeTag,
    genres[1],
    AUDIENCE_HASHTAGS[1],
    genres[2],
    AUDIENCE_HASHTAGS[2],
  ].filter((t) => t && SAFE_TAG_RE.test(t));
  const out = {};
  for (const k of PLATFORM_ORDER) {
    const seen = new Set();
    const tags = [];
    const first = PLATFORM_FIRST_TAGS[k] ? PLATFORM_FIRST_TAGS[k]().filter((t) => t && SAFE_TAG_RE.test(t)) : [];
    for (const t of [...first, ...priority]) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(t);
      if (tags.length >= HASHTAG_LIMITS[k]) break;
    }
    out[k] = tags;
  }
  return out;
}

// ── 名前の整形 ───────────────────────────────────────────────
// 対外文章は絵文字ゼロ。DBの値は変えず、表示に使う直前で取り除く。
const EMOJI_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u{FE0F}\u{FE0E}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

export function stripEmoji(s) {
  return String(s || '').replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
}

// キャプションと件名に出す名前。絵文字を除いた結果が空なら媒体名（playlist 列）を使う。
export function displayNames(curator) {
  const platform = stripEmoji(curator.platform);
  const name = stripEmoji(curator.name) || platform;
  return {
    name,
    platform: platform || null,
    emojiRemoved: name !== String(curator.name || '').trim() || (platform || '') !== String(curator.platform || '').trim(),
  };
}

// ── SNSアカウント ────────────────────────────────────────────
// DBに入っている値だけを使う（A06: 推測で作らない）。curators.social_links の
// instagram / twitter / website と、url / playlist_url を見る。
// 完全なURLはホスト名で媒体を判定する（キーと中身が食い違っている行があるため。
// 例: twitter キーに instagram.com のURL）。@つき・URLでない値は、キーの媒体として扱う。
const HANDLE_RULES = {
  x: /^[A-Za-z0-9_]{1,15}$/,
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  threads: /^[A-Za-z0-9._]{1,30}$/,
};
const RESERVED_PATHS = {
  x: ['home', 'i', 'intent', 'share', 'search', 'hashtag', 'explore', 'settings', 'messages', 'notifications'],
  instagram: ['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'tv', 'direct'],
  threads: [],
};
const HOSTS = [
  [/^(?:www\.|mobile\.)?(?:x|twitter)\.com$/, 'x'],
  [/^(?:www\.|m\.)?instagram\.com$/, 'instagram'],
  [/^(?:www\.)?threads\.(?:net|com)$/, 'threads'],
  [/^(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/^(?:[a-z]{2,3}\.|www\.)?linkedin\.com$/, 'linkedin'],
  [/^(?:www\.|m\.)?(?:youtube\.com|youtu\.be)$/, 'youtube'],
];
const KEY_PLATFORM = { twitter: 'x', x: 'x', instagram: 'instagram', threads: 'threads' };

function validHandle(platform, h) {
  if (!h || !HANDLE_RULES[platform]) return null;
  if (!HANDLE_RULES[platform].test(h)) return null;
  if (RESERVED_PATHS[platform].includes(h.toLowerCase())) return null;
  // Instagram は先頭・末尾のピリオドと連続ピリオドを許さない。
  if (platform !== 'x' && (/^\.|\.$/.test(h) || h.includes('..'))) return null;
  return h;
}

// 1つの値を {platform, handle?, url?} にする。使えない値は null。
export function parseSocialValue(raw, keyHint) {
  const v = String(raw || '').trim();
  if (!v) return null;
  const looksUrl = /^https?:\/\//i.test(v) || /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\//i.test(v);
  if (looksUrl) {
    let u;
    try { u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); } catch { return null; }
    const host = u.hostname.toLowerCase();
    const hit = HOSTS.find(([re]) => re.test(host));
    if (!hit) return null;
    const platform = hit[1];
    const segs = u.pathname.split('/').filter(Boolean);
    if (platform === 'facebook' || platform === 'linkedin' || platform === 'youtube') {
      if (!segs.length) return null;
      // 動画・再生リスト・共有ボタンなど、アカウントのページではないURLは使わない。
      const NOT_ACCOUNT = ['watch', 'playlist', 'shorts', 'embed', 'results', 'live', 'sharer', 'sharer.php', 'share', 'profile.php', 'posts', 'feed', 'pulse'];
      if (NOT_ACCOUNT.includes(segs[0].toLowerCase()) || host.endsWith('youtu.be')) return null;
      return { platform, url: `https://${host.replace(/^(m|web|mobile)\./, 'www.')}/${segs.join('/')}` };
    }
    let h = segs[0] || '';
    if (platform === 'threads') {
      if (!h.startsWith('@')) return null;
      h = h.slice(1);
    }
    const handle = validHandle(platform, h);
    return handle ? { platform, handle } : null;
  }
  // URLでない値は「@handle」か「handle」。キーの媒体として検証する。
  const platform = KEY_PLATFORM[keyHint];
  if (!platform) return null;
  const handle = validHandle(platform, v.replace(/^@/, ''));
  return handle ? { platform, handle } : null;
}

// curator → { x, instagram, threads, facebook, linkedin, youtube }。
// x / instagram / threads は handle、facebook / linkedin / youtube はURL。無いものは null。
// 同じ媒体に複数の候補があるときは、その媒体のキーに入っている値を優先する。
export function extractSocialAccounts(curator) {
  const links = (curator.social_links && typeof curator.social_links === 'object') ? curator.social_links : {};
  const candidates = [];
  for (const [key, val] of Object.entries(links)) {
    const p = parseSocialValue(val, key);
    if (p) candidates.push({ ...p, own: KEY_PLATFORM[key] === p.platform });
  }
  for (const col of ['url', 'playlist_url']) {
    const p = parseSocialValue(curator[col], null);
    if (p) candidates.push({ ...p, own: false });
  }
  const out = { x: null, instagram: null, threads: null, facebook: null, linkedin: null, youtube: null };
  for (const c of [...candidates.filter((c) => c.own), ...candidates.filter((c) => !c.own)]) {
    if (out[c.platform]) continue;
    out[c.platform] = c.handle || c.url;
  }
  return out;
}

// 本文に @ を差し込む媒体（貼り付けた文字列でタグ付けになる媒体）。
// Threads は Threads のアカウントが登録されている場合だけ。Instagram の名前を流用しない。
const MENTION_SOURCE = { x: 'x', instagram: 'instagram', threads: 'threads' };

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// 生成文では ' が ’ になることがあるので、どちらでも当たるようにする。
function nameRe(name) {
  return new RegExp(escapeRe(name).replace(/['’]/g, "['’]"), 'g');
}

// 本文中で最初に出てくる媒体名（無ければキュレーター名）の直後に「（@handle）」を入れる。
// どちらも本文に無いときは、URL の前の行に「@handle」を置く。
export function insertMention(text, handle, names) {
  if (!handle) return text;
  const tag = `（@${handle}）`;
  if (text.includes(`@${handle}`)) return text;
  let best = null;
  for (const n of names.filter(Boolean)) {
    const re = nameRe(n);
    let m;
    while ((m = re.exec(text))) {
      const end = m.index + m[0].length;
      if (!best || m.index < best.start || (m.index === best.start && end > best.end)) {
        best = { start: m.index, end };
      }
      break; // 名前ごとに初出だけ見る
    }
  }
  if (best) {
    // 「名前さん」のときは「さん」のあとに置く（「Collin（@x）さん」にしない）。
    const end = text.startsWith('さん', best.end) ? best.end + 2 : best.end;
    return text.slice(0, end) + tag + text.slice(end);
  }
  const i = text.lastIndexOf('https://otonami.io');
  if (i === -1) return `${text}\n@${handle}`;
  return `${text.slice(0, i)}@${handle}\n${text.slice(i)}`;
}

// ── 生成用の事実ブロック ──────────────────────────────────────
// 内部の項目名（platform / region など）を本文に写させないため、ラベルは日本語の
// 自然な語にし、値も日本語にできるものは変換して渡す。
const TYPE_JA = {
  playlist: 'プレイリスト',
  radio: 'ラジオ局',
  label: 'レーベル',
  blog: '音楽ブログ',
  media: '音楽メディア',
  sync: 'シンク（映像向け楽曲）',
  management: 'マネジメント',
};
const OPPORTUNITY_JA = {
  playlist: 'プレイリストへの追加',
  blog: 'ブログ・記事での紹介',
  label: 'レーベル契約',
  social: 'SNSでの紹介',
  radio: 'ラジオでのオンエア',
  interview: 'インタビュー',
  management_signing: 'マネジメント契約',
  reel: 'SNS投稿・リールの作成',
  sync_licensing: 'シンク・ライセンス',
  event: 'イベント出演',
  live_booking: 'ライブのブッキング',
};
// 地域に触れない region（「活動範囲はGlobal」のような文を出さない）。
const NO_REGION = new Set(['global', 'other', '']);

// 渡されたフィールド以外を創作させないため、事実は curator の許可フィールドだけを埋め込む。
// genres（ジャンル）/ preferred_moods（ムード）は空のことがあるので「値があるときだけ」含める。
// 空なら行ごと出さない＝言及禁止が自然に効く（A06: 創作禁止）。
function buildFactBlock(curator) {
  const { name, platform } = displayNames(curator);
  const genres = (curator.genres && curator.genres.length)
    ? curator.genres.slice(0, MAX_GENRES)
    : [];
  const moods = (curator.preferred_moods && curator.preferred_moods.length)
    ? curator.preferred_moods.slice(0, MAX_MOODS)
    : [];
  const region = String(curator.region || '').trim();
  const opportunities = (curator.opportunities || [])
    .map((o) => OPPORTUNITY_JA[o])
    .filter(Boolean);
  const lines = [
    `- キュレーター名: ${name}`,
    platform && platform !== name ? `- 媒体名: ${platform}` : null,
    !NO_REGION.has(region.toLowerCase()) ? `- 活動地域: ${region}` : null,
    TYPE_JA[curator.type] ? `- 種別: ${TYPE_JA[curator.type]}` : null,
    opportunities.length ? `- 提供できる機会: ${opportunities.join('、')}` : null,
    // genres は実DBの本命列（旧 accepts は死列のため使わない）。
    genres.length ? `- 好むジャンル: ${genres.join(', ')}` : null,
    moods.length ? `- 好むムード: ${moods.join(', ')}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildSnsIntroPrompt(curator) {
  const facts = buildFactBlock(curator);
  return `あなたはOTONAMIのSNS運用担当です。OTONAMIは、日本のインディーアーティストと海外のキュレーター（プレイリスト編集者・音楽ブロガー・ラジオDJ・レーベル）をつなぐ音楽ピッチサービスです。
新しく参加してくれたキュレーターを、OTONAMIの公式SNSで「紹介」する投稿文を作成します。

# 紹介するキュレーターの確定情報（これ以外の事実は一切使わない・創作しない）
${facts}

# キュレーターの特徴を使った訴求（今回の強化の核）
上の確定情報に「好むジャンル」や「好むムード」が含まれている場合、それを使って「どんな曲が刺さるか」を1〜2文で書く。
- ジャンルとムードを具体的に挙げ、アーティストが「自分の曲が合うか」を判断できる形にする。
- 例:「Jazz や Ambient、Lo-fi を好み、Melancholic や Dreamy な空気感の楽曲に耳を傾けるキュレーターです。こうした世界観に近い曲を届けたい日本・アジアのアーティストの方は、ピッチが響くかもしれません。」
- トーンは敬体でやわらかく。「〜かもしれません」のように、断定や煽りを避ける。
- A06（厳守）: 好むジャンルも好むムードも確定情報に無い場合は、「どんな曲が刺さるか」の文を書かない。ジャンル/ムードを創作しない。具体的な数値（フォロワー数・登録者数・再生数など）も一切補わない。

# ブランドルール（例外なし・厳守）
- 絵文字は一切使わない。
- ハッシュタグ（#）とメンション（@）は書かない。どちらもあとでシステムが付ける。
- トーン: 柔らかい語尾で、煽らない。自己啓発調・誇張・過度な感嘆をしない。落ち着いた紹介文。
- ILCJとOTONAMIは別法人。OTONAMIをILCJの事業として書かない。ILCJに言及しない。
- 数字は上に渡した確定情報にある値だけ使う。人数・期間・実績などの不確かな数字や推測は書かない。
- 言語は日本語を主体にする。ただしキュレーター名・媒体名は原語表記のまま変えない（アポストロフィなどの記号も含めてそのまま書く）。
- 上の確定情報にある事実だけを使う。それ以外の属性を足さない。確定情報に無い項目（活動地域など）には触れない。
- 確定情報の項目名（「キュレーター名」「媒体名」「活動地域」「種別」など）や、括弧書きの補足ラベルを本文にそのまま書かない。自然な文章の中で紹介する。
- 各キャプションに、キュレーター名か媒体名のどちらかを必ず1回以上、原語表記のまま入れる。
- 好むジャンル/好むムードは確定情報に無ければ一切触れない（推測して書かない）。
- X 用は、キュレーターの紹介だけを短い2文までで書く（目安は全角${X_BODY_MAX_ZENKAKU}字以内）。字数を数えた過程や確認の文は書かない。あとで URL・ハッシュタグ・メンションが付く。
- 各媒体の長さの目安: X=短め・リンク1本前提 / Instagram=やや長め / Threads=会話的 / Facebook=標準 / LinkedIn=ややフォーマル。

# 追加ルール（最終・最優先で厳守）
- ターゲット表記は「日本・アジアのアーティスト」で統一する。「インディー」「インディーズ」など対象を限定する語は使わない。
- 全文を敬体（です・ます）で統一する。「〜できますよ」「〜ですよ」のような砕けた・投げやりな語尾は使わない。丁寧さを保ちつつ柔らかいトーンにする（馴れ馴れしくしない）。
- 読者にはOTONAMIをまだ知らない・登録していないアーティストも含まれる前提で書く。「OTONAMIが何か」を説明する一文と導線URLは、システムが固定の文で付けるので、自分では書かない（どの媒体にも「OTONAMIは〜サービスです」のような説明文やURLを入れない。X には説明文を付けないが、X でも書かない）。「ピッチしてください」のように登録済みだけを前提にした締めにしない。
- 本文は、そのあとに説明文とURLが続いても自然に読める形で終える。
- 紹介する相手（キュレーター名）には必ず「さん」を付ける（「氏」「様」や呼び捨てにしない）。

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
  for (const k of PLATFORM_ORDER) {
    out[k] = typeof obj[k] === 'string' ? obj[k].trim() : '';
  }
  return out;
}

// 生成文の後処理（決定論）。
// - 生成文に紛れたハッシュタグ・絵文字・内部の項目名の括弧書きを取り除く
// - 本文に @ を差し込む（X / Instagram / Threads。アカウントがある媒体だけ）
// - 媒体ごとのタグを末尾（URLのあと）に改行して1行で置く
const LABEL_PAREN_RE = /[（(][^（）()]*\b(?:platform|region|type|name|opportunities|genres|preferred_moods)\s*[:：][^（）()]*[）)]/gi;

function tidy(text) {
  return text
    .replace(/[ \t　]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t　]{2,}/g, ' ')
    .replace(/[ \t　]+$/gm, '')
    .trim();
}

// モデルが書いてしまった OTONAMI の説明文（「OTONAMIは…」「…ピッチサービス…」の文）を除く。
const OTONAMI_DESC_RE = /[^。！？\n]*(?:ピッチサービス|OTONAMI\s*(?:は|とは))[^。！？\n]*[。！？]?/g;

// URL を指す導入文（URL はコードで説明文のあとに付けるので、モデル側の導入文は外す）。
const LINK_LEADIN_RE = /[^。！？\n]*(?:詳しくは|詳細は|こちらから|こちらより|以下より|以下から)[^。！？\n]*[。！？]?/g;

// X には固定の説明文を付けない（11/22 山下さん決定）。X 本文の全角90字はすべてキュレーターの紹介に使う。
const NO_SENTENCE_PLATFORMS = new Set(['x']);

// 作り直しの途中経過（「文字数を数えます」「さらに短くします」など）の検出。
const PROGRESS_RE = /文字数|字数|全角|半角|カウント|数えます|短くします|削ります|調整します|書き直します|確認します|もう一段|まだ長い/;
export function hasProgressText(text) {
  return PROGRESS_RE.test(String(text || ''));
}

// 敬称: 紹介する相手の名前には必ず「さん」を付ける。氏・様は「さん」にそろえる。
export function enforceHonorific(text, name) {
  if (!name) return text;
  const n = escapeRe(name).replace(/['’]/g, "['’]");
  // 「名前 さん」（空白入り）は「名前さん」に詰め、氏・様は「さん」にそろえ、無ければ付ける。
  return text
    .replace(new RegExp(`(${n})[ 　]+さん`, 'g'), '$1さん')
    .replace(new RegExp(`(${n})(?:氏|様|さま)?(?!さん)`, 'g'), '$1さん');
}
// 名前が出てくる箇所がすべて「さん」付きか。
export function honorificOk(text, name) {
  if (!name) return true;
  const n = escapeRe(name).replace(/['’]/g, "['’]");
  const t = String(text || '');
  // 名前のあとに「さん」が無い箇所も、「さん」が重なった箇所もだめ。
  return !new RegExp(`${n}(?!さん)`).test(t) && !new RegExp(`${n}さん[ 　]*さん`).test(t);
}


// モデルの文から、タグ・絵文字・項目名ラベル・URL・OTONAMI の説明文を除いた本文。
export function cleanModelBody(text) {
  let t = String(text || '');
  t = t.replace(/(^|[\s　])#[^\s#　]+/g, '$1'); // タグはコード側で付ける
  t = t.replace(EMOJI_RE, '');
  t = t.replace(LABEL_PAREN_RE, '');
  t = t.replace(/https?:\/\/\S+/g, ''); // URL はコード側で付ける
  t = t.replace(OTONAMI_DESC_RE, ''); // 説明文はコード側で付ける
  t = t.replace(LINK_LEADIN_RE, ''); // URL を外したあとに残る「詳しくはこちらから」の類
  return tidy(t);
}

// X のタグを外す順: 末尾から。ただし #OTONAMI は最後まで残す（11/22 山下さん決定）。
function dropOneXTag(tags) {
  for (let i = tags.length - 1; i >= 0; i--) {
    if (tags[i] !== BRAND_HASHTAG) return tags.splice(i, 1)[0];
  }
  return tags.pop();
}

// trimX: true のとき、X が 280 を超えたらタグを外す（作り直しのあとに使う）。
export function finalizeCaptions(raw, curator, { trimX = true } = {}) {
  const { name, platform } = displayNames(curator);
  const accounts = extractSocialAccounts(curator);
  const hashtags = buildHashtags(curator);
  const xTagsRemoved = [];
  const out = {};
  for (const k of PLATFORM_ORDER) {
    let text = enforceHonorific(cleanModelBody(raw[k]), name);
    const src = MENTION_SOURCE[k];
    if (src && accounts[src]) text = insertMention(text, accounts[src], [platform, name]);
    // 固定の説明文と URL を最後に付ける（本文が文末で終わっていなければ改行を挟む）。
    const sep = !text || /[。！？]$/.test(text) ? '' : '\n';
    const sentence = NO_SENTENCE_PLATFORMS.has(k) ? '' : OTONAMI_SENTENCE;
    text = `${text}${sep}${sentence}${CTA_URL}`;
    const tags = [...hashtags[k]];
    const withTags = () => (tags.length ? `${text}\n${tags.join(' ')}` : text);
    // X は 280 を超えたらタグを外す（#OTONAMI は最後）。外し切っても超えるならそのまま（メールで警告）。
    if (k === 'x' && trimX) {
      while (tags.length && xWeightedLength(withTags()) > X_MAX_WEIGHTED) {
        xTagsRemoved.push(dropOneXTag(tags));
      }
      hashtags[k] = tags;
    }
    out[k] = withTags();
  }
  return { captions: out, accounts, hashtags, xTagsRemoved };
}

// X の数え方（twitter-text と同じ範囲）: ラテン文字・一部の記号は1、それ以外（日本語など）は2、
// URL は長さによらず23。
const X_LIGHT_RANGES = [[0x0000, 0x10ff], [0x2000, 0x200d], [0x2010, 0x201f], [0x2032, 0x2037]];
export function xWeightedLength(text) {
  const urls = String(text || '').match(/https?:\/\/\S+/g) || [];
  let n = urls.length * 23;
  for (const ch of String(text || '').replace(/https?:\/\/\S+/g, '')) {
    const c = ch.codePointAt(0);
    n += X_LIGHT_RANGES.some(([a, b]) => c >= a && c <= b) ? 1 : 2;
  }
  return n;
}

// 検証用: 絵文字・ハッシュタグ・内部の項目名の残りを媒体ごとに数える（証明・ガード用）。
export function auditCaptions(captions, name) {
  const perPlatform = {};
  let hasEmoji = false;
  let labelLeaks = 0;
  for (const k of PLATFORM_ORDER) {
    const t = captions[k] || '';
    const tags = t.match(/#[^\s#　]+/g) || [];
    const emoji = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(t);
    const leaks = (t.match(/\b(?:platform|region)\s*[:：]|\bregion\s*は/gi) || []).length;
    hasEmoji = hasEmoji || emoji;
    labelLeaks += leaks;
    perPlatform[k] = {
      honorificOk: honorificOk(t, name),
      hashtagCount: tags.length,
      hashtags: tags,
      overLimit: tags.length > HASHTAG_LIMITS[k],
      unsafeTags: tags.filter((x) => !SAFE_TAG_RE.test(x)),
      mentions: t.match(/@[A-Za-z0-9._]+/g) || [],
      descriptionCount: t.split(OTONAMI_SENTENCE).length - 1,
      otherDescriptions: (t.split(OTONAMI_SENTENCE).join('').match(/ピッチサービス/g) || []).length,
      urlCount: (t.match(/https?:\/\/\S+/g) || []).length,
      progressText: hasProgressText(t),
    };
  }
  const xLength = xWeightedLength(captions.x);
  return {
    hasEmoji,
    labelLeaks,
    xLength,
    xOverLimit: xLength > X_MAX_WEIGHTED,
    hashtagCount: Object.values(perPlatform).reduce((a, p) => a + p.hashtagCount, 0),
    perPlatform,
  };
}

// X の作り直し回数の上限（タグを全部外しても 280 を超えるときだけ使う）。
export const X_REWRITE_MAX = 2;

// X 本文だけを短く作り直すプロンプト。長さはコードで測った実測値を渡す。
// 残す優先順位（11/22 山下さん決定）: (1) OTONAMI の説明1文 (2) その媒体が何者か (3) 提供できる機会。
// (1) はコードが固定の文で付けるので、モデルには (2)(3) だけを書かせる。
export function buildXRewritePrompt(curator, currentBody, { currentLength, targetZenkaku }) {
  return `あなたはOTONAMIのSNS運用担当です。次の X（旧Twitter）用の紹介文が長すぎて投稿できません。短く書き直してください。

# 今の本文
${currentBody}

# あとからシステムが付けるもの（あなたは書かない）
- 本文のあとに URL（${CTA_URL}）
- ハッシュタグとメンション

# 長さ
- 今の本文は、上のものを足すと X の数え方で ${currentLength} あり、上限 ${X_MAX_WEIGHTED} を超えています。
- 書き直す本文は、今より短い1〜2文にしてください（目安は全角${targetZenkaku}字以内）。

# 残す優先順位（上ほど大事。入らないものは下から削る）
1. その媒体（キュレーター）が何者か: キュレーター名か媒体名を原語表記のまま1回以上入れ、種別やジャンルで何者かがわかるようにする。
2. 提供できる機会: 数語に縮める。入らなければ省いてよい。

# 確定情報（これ以外の事実は使わない）
${buildFactBlock(curator)}

# ルール
- 敬体（です・ます）。絵文字・ハッシュタグ（#）・メンション（@）は書かない。
- 「日本・アジアのアーティスト」の表記を変えない。ILCJに言及しない。
- 紹介する相手（キュレーター名）には必ず「さん」を付ける。
- OTONAMI の説明文と URL は書かない。
- 字数を数えた過程・確認・言い訳の文は書かない。

# 出力形式
次のキーだけを持つ有効なJSONのみを返す。前後の説明・マークダウン・バッククォートは付けない。
{"x": "書き直した本文"}`;
}


export async function generateSnsIntroCaptions(curator) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const client = new Anthropic({ apiKey });
  const prompt = buildSnsIntroPrompt(curator);

  const response = await client.messages.create({
    ...anthropicRequestBase('snsIntro'),
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content?.[0]?.text || '';
  const raw = parseCaptionsJson(text);
  // タグ・メンション・説明文・URL・表記の整形はすべてコード側で決定論的に行う。
  // X の順番（11/22 山下さん決定）: 280 を超えたら、まず本文を最大 X_REWRITE_MAX 回作り直す。
  // それでも超えるときだけタグを外す（#OTONAMI は最後）。外し切っても超えたらメールで警告。
  const xRewrites = [];
  const { name } = displayNames(curator);
  for (let i = 0; i < X_REWRITE_MAX; i++) {
    const currentLength = xWeightedLength(finalizeCaptions(raw, curator, { trimX: false }).captions.x);
    if (currentLength <= X_MAX_WEIGHTED) break;
    const body = cleanModelBody(raw.x);
    // 超過分＋余裕10を本文から削らせる。
    const targetZenkaku = Math.max(20, Math.floor((xWeightedLength(body) - (currentLength - X_MAX_WEIGHTED) - 10) / 2));
    const r = await client.messages.create({
      ...anthropicRequestBase('snsIntro'),
      max_tokens: 600,
      messages: [{ role: 'user', content: buildXRewritePrompt(curator, body, { currentLength, targetZenkaku }) }],
    });
    // 返答は JSON の x だけを使う。採らない条件: 取り出せない／途中経過が混ざる／
    // 名前の「さん」が落ちる／元より長くなる。採らなかったときは元の文を残す。
    let candidate = '';
    try { candidate = parseCaptionsJson(r.content?.[0]?.text || '').x; } catch { candidate = ''; }
    const candLength = candidate
      ? xWeightedLength(finalizeCaptions({ ...raw, x: candidate }, curator, { trimX: false }).captions.x)
      : null;
    let rejected = null;
    if (!candidate) rejected = 'JSONで返らなかった';
    else if (hasProgressText(candidate)) rejected = '途中経過が混ざった';
    else if (new RegExp(escapeRe(name).replace(/['’]/g, "['’]")).test(candidate) && !honorificOk(candidate, name)) rejected = '敬称が落ちた';
    else if (candLength >= currentLength) rejected = '元より長い';
    if (!rejected) raw.x = candidate;
    xRewrites.push({ targetZenkaku, before: currentLength, after: candLength, rejected, stopReason: r.stop_reason });
  }
  const result = finalizeCaptions(raw, curator, { trimX: true });

  const { captions, accounts, hashtags, xTagsRemoved } = result;
  const audit = { ...auditCaptions(captions, displayNames(curator).name), xTagsRemoved, xRewrites };
  return { captions, audit, accounts, hashtags, names: displayNames(curator), stopReason: response.stop_reason };
}
