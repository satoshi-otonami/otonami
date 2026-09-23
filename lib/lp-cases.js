// LP「これまでに確認できた成果 / Results we've confirmed so far」の唯一の文言ソース。
//
// - JA は確定文そのまま。数字・固有名詞を足したり言い換えたりしない。
// - published: true ＝ 本人の同意・文言確認が取れている。false のカードは名前ごと描画されない。
// - 匿名事例の supersededBy は、同じ成果を実名で紹介するカードの id。そのカードが公開中なら匿名側は出さない
//   （同じ成果が匿名と実名で二重に見えるのを防ぐ）。
// - プレイリスト掲載は過去形のみ。「現在掲載中 / currently on」系の表現は使わない。

export const LP_CASES_INTRO = {
  eyebrow: { ja: '成果', en: 'Results' },
  heading: { ja: 'これまでに確認できた成果', en: "Results we've confirmed so far" },
  lead: {
    ja: 'OTONAMIのピッチから実際に掲載や引き合いにつながった事例の一部です。いずれも掲載先を個別に確認できたもののみを紹介しています（2026年9月時点）。',
    en: 'A selection of pitches sent through OTONAMI that led to actual placements or inquiries. We only include cases where we were able to confirm each placement individually (as of September 2026).',
  },
};

// 第1層：匿名事例
export const ANON_CASES = [
  {
    id: 'anon-jazz-fusion',
    subject: { ja: '東京のジャズ・フュージョンバンド', en: 'A jazz-fusion band from Tokyo' },
    body: {
      ja: '1曲のピッチが、送信当日から1週間ほどの間に、イタリア、ブラジル、アメリカなど7つのプレイリストに掲載。海外のラジオ番組にも採用されました',
      en: 'A single pitch led to placements on seven playlists in countries including Italy, Brazil and the US, starting the day it was sent and over roughly the following week. The track was also picked up for radio outside Japan.',
    },
    // ROUTE14band のストーリーと部分的に重なるが、こちらの方が成果が広いので両方残す（2026-09-23 判断）
    supersededBy: null,
  },
  {
    id: 'anon-jrock-ballad',
    subject: { ja: 'J-Rockバンドのバラード', en: 'A ballad by a J-Rock band' },
    body: {
      ja: 'ブラジルの音楽メディアのプレイリストをはじめ5つのプレイリストに掲載。海外ジャーナリストによるレビュー動画も公開されました',
      en: 'Added to five playlists, including one run by a Brazilian music media outlet. A music journalist outside Japan also published a video review.',
    },
    supersededBy: null,
  },
  {
    id: 'anon-city-pop',
    subject: { ja: 'シティポップ系のソロアーティスト', en: 'A city pop solo artist' },
    body: {
      ja: 'シティポップ専門の海外キュレーターのプレイリストに掲載されました',
      en: 'Added to a playlist by an international curator who specializes in city pop.',
    },
    supersededBy: 'artist-chihitek',
  },
  {
    id: 'anon-electronic',
    subject: { ja: 'エレクトロニック / アンビエントのアーティスト', en: 'Electronic / ambient artists' },
    body: {
      ja: 'YouTube Musicのプレイリストに3曲が掲載されました',
      en: 'Three tracks were added to YouTube Music playlists.',
    },
    supersededBy: 'artist-epic-vanguard',
  },
  {
    id: 'anon-sync',
    subject: null,
    body: {
      ja: '米国のシンク・エージェンシーからは、複数のアーティストにレプリゼンテーションの打診が届いています',
      en: 'A US sync agency has reached out to several artists about representation.',
    },
    supersededBy: null,
  },
];

// 第2層：キュレーター実名カード（本人確認が取れたものから published: true に）
export const CURATOR_CARDS = [
  {
    id: 'curator-tinnitist',
    published: false,
    name: 'Tinnitist',
    descriptor: { ja: 'カナダの音楽メディア', en: 'Canadian music media outlet' },
    // 文言は本人確認待ち。Top 300 は「追加された」とだけ書き、「現在掲載中」とは書かない（本人の明示要望）
    statement: null,
    quote: null,
    photoUrl: null,
    link: 'https://tinnitist.com',
  },
  {
    id: 'curator-van-paugam',
    published: false,
    name: 'Van Paugam',
    descriptor: { ja: 'NEO-CITY POP', en: 'NEO-CITY POP' },
    statement: {
      ja: 'OTONAMI経由でピッチされた楽曲が、Van Paugam氏がキュレーションするシティポップのプレイリスト『NEO-CITY POP』に追加されました。',
      en: 'Tracks pitched through OTONAMI were added to NEO-CITY POP, the city pop playlist curated by Van Paugam.',
    },
    // 引用は本人の許諾待ち。JA 表示でも英語原文のまま出す
    quote: {
      published: false,
      text: "If I hear a song from a Japanese artist that I genuinely like, I don't want the interaction to end with a review.",
      attribution: 'Van Paugam',
    },
    photoUrl: null,
    link: 'https://open.spotify.com/playlist/6US7ZVtZ163U0ylpB0vBdb',
  },
];

// 第3層：アーティスト・キュレーター両実名のストーリー
export const STORIES = [
  {
    id: 'story-route14band',
    published: true,
    artist: 'ROUTE14band',
    curator: 'Rádio Armazém',
    body: {
      ja: 'ブラジルのWebラジオ局 Rádio Armazém が、ROUTE14band の「C1 (Tokyo Inner Loop)」を収録したプレイリスト「Otonami Brazil Connection」を作成しました。',
      en: 'Rádio Armazém, a web radio station in Brazil, created the playlist "Otonami Brazil Connection," which features "C1 (Tokyo Inner Loop)" by ROUTE14band.',
    },
    links: [
      {
        label: { ja: 'プレイリストを聴く', en: 'Listen to the playlist' },
        href: 'https://open.spotify.com/playlist/3nPL0rPOzQTL3htLsJQHaU',
      },
      { label: { ja: 'radioarmazem.net', en: 'radioarmazem.net' }, href: 'https://radioarmazem.net/' },
    ],
  },
];

// アーティスト実名カード（名前＋曲名＋実績のみ。一行紹介は付けない）
export const ARTIST_CARDS = [
  {
    id: 'artist-epic-vanguard',
    published: true,
    name: 'Epic Vanguard',
    tracks: ['Caged in Silence', 'Leave Behind'],
    result: {
      ja: '海外キュレーターのYouTube Musicプレイリストに2曲が掲載',
      // 2曲とも同一プレイリスト（placement_url の list= が同じ）なので単数
      en: "Two tracks added to an international curator's YouTube Music playlist",
    },
    resultNamed: null,
  },
  {
    id: 'artist-chihitek',
    published: true,
    name: 'chihitek',
    tracks: ['Kabukicho Ichibangai'],
    result: {
      ja: 'シティポップ専門の海外キュレーターのプレイリストに掲載',
      en: 'Added to a playlist by an international curator who specializes in city pop',
    },
    // Van Paugam 氏の文言確認が取れたら published: true にして実名版へ切り替える
    resultNamed: {
      published: false,
      ja: 'Van Paugam氏のプレイリスト『NEO-CITY POP』に掲載',
      en: 'Added to NEO-CITY POP, the city pop playlist curated by Van Paugam',
      link: 'https://open.spotify.com/playlist/6US7ZVtZ163U0ylpB0vBdb',
    },
  },
];

export const GUARANTEE_NOTE = {
  ja: '掲載やオンエアの可否は各キュレーターの判断によるものです。結果を保証するものではありませんが、未返答の場合はクレジットが全額自動で戻ります。',
  en: "Whether a track gets placed or aired is up to each curator. We can't guarantee results, but if a curator doesn't respond, your credits are refunded in full automatically.",
};

const PUBLISHED_IDS = new Set(
  [...CURATOR_CARDS, ...STORIES, ...ARTIST_CARDS].filter((c) => c.published).map((c) => c.id),
);

/** Anonymous cases minus the ones already told under a published real name. */
export function visibleAnonCases() {
  return ANON_CASES.filter((c) => !(c.supersededBy && PUBLISHED_IDS.has(c.supersededBy)));
}

export const visibleCuratorCards = () => CURATOR_CARDS.filter((c) => c.published);
export const visibleStories = () => STORIES.filter((c) => c.published);
export const visibleArtistCards = () => ARTIST_CARDS.filter((c) => c.published);
