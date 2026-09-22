// lib/pitch-tone.js
// TONE LOCK が効いているときに、生成されたピッチ／EPK に出てはいけない語。
//
// なぜ別ファイルか: app/api/pitch/route.js は Next.js の route handler なので、
// 予約済み以外の named export を足すのは避けたい。プロンプト側（FORBIDDEN
// リストと出力直前の FINAL CHECK）と回帰テストが同じ配列を見る必要がある
// ので、唯一の出所をここに置く。2箇所に書くと片方だけ直して静かにズレる。
//
// 由来: アーティストが「楽しい曲」と書いているのに melancholic / introspective
// 系の語で紹介されてしまう事故への対策。もとは temperature: 0.3 で確率的に
// 抑えていたが、Sonnet 5 以降 temperature は API から削除された（渡すと 400）
// ため、プロンプト側の明示指示と決定論的スクラブに寄せている。
export const FORBIDDEN_TONE_WORDS = [
  'melancholic', 'melancholy', 'melancholia', 'brooding', 'somber', 'sad',
  'sorrowful', 'mournful', 'dark', 'gloomy', 'introspective', 'introspection',
  'contemplative', 'contemplation', 'reflective', 'reflection', 'pensive',
  'wistful', 'bittersweet',
];

// 生成結果に禁止語が混入していないか調べる。回帰テストの PASS 判定用。
// 単語境界で見るので "darkness" は拾うが "Darkwave"（ジャンル名）のような
// 複合語も語頭一致で拾う点は許容（混入ゼロを厳しく見る方を優先）。
export function findForbiddenToneWords(text) {
  if (!text) return [];
  const hits = [];
  for (const w of FORBIDDEN_TONE_WORDS) {
    const re = new RegExp(`\\b${w}\\b`, 'i');
    if (re.test(text)) hits.push(w);
  }
  return hits;
}
