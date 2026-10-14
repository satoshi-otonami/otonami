// First-pitch guide (/guide). Linked from the activation email to artists who
// have not sent a pitch yet. Public, Japanese only. The copy is fixed — do not
// edit wording here without a new instruction; the images in public/guide are
// blurred on purpose (balances, curator and sender names).

import { H2_SM } from '@/components/landing/SectionType';
import { DT as D } from '@/lib/design-tokens';

export const metadata = {
  title: 'はじめてのピッチ送信ガイド | OTONAMI',
  description:
    '曲を選んで、相手を選んで、送る。OTONAMIで最初の1曲を海外キュレーターに届けるまでの手順を、画面つきでご案内します。',
};

const C = {
  bg: '#faf8f5',
  text: '#1a1a1a',
  sub: '#6b6560',
  accent: '#c4956a',
  border: '#e5e2dc',
};

const STEPS = [
  {
    title: '0. OTONAMIでできること',
    body: [
      'あなたの曲を、海外のプレイリスト運営者・ラジオDJ・音楽メディアに直接届けられます。この「聴いて選ぶ人たち」を、OTONAMIではまとめてキュレーターと呼びます。',
      '英語はすべて自動です。送る文章も、届いた返事も、OTONAMIが翻訳します。',
      'そして、期限までに返事がなければ、使ったクレジットは全額自動で戻ります。',
      { img: 'guide-02-home.jpg', w: 755, h: 645 },
    ],
  },
  {
    title: '1. ログインする',
    body: [
      'otonami.io を開いて、登録したメールアドレスとパスワードでログインします。',
      { img: 'guide-01-login.jpg', w: 515, h: 600 },
    ],
  },
  {
    title: '2. あなたの曲を教える',
    body: [
      '上のメニューから「キュレーター」を開きます。',
      '曲名とアーティスト名を入れて、「分析する」を押してください。曲のURL（SpotifyかYouTube）も貼ります。これはキュレーターがあなたの曲を聴くためのリンクです。',
      { img: 'guide-03-curators.jpg', w: 755, h: 758 },
    ],
  },
  {
    title: '3. マッチ度を見る',
    body: [
      '分析が終わると、キュレーターごとに「あなたの曲との相性」がパーセントで表示されます。数字が大きいほど、あなたの曲を気に入ってくれそうな相手です。',
      { img: 'guide-03b-card.jpg', w: 675, h: 189 },
    ],
  },
  {
    title: '4. 送る相手を選ぶ',
    body: [
      'カードには、その人が何をしてくれるか（プレイリスト・ラジオ・メディアなど）と、送るのに必要なクレジット数が書いてあります。',
      '「＋」を押すと選べます。何人でもまとめて選べます。',
      { img: 'guide-04-select.jpg', w: 755, h: 265 },
    ],
  },
  {
    title: '5. クレジットを買う',
    body: [
      'クレジットは、ピッチを送るときに使うチケットのようなものです。右上の「＋購入」から買えます。',
      '1クレジット160円。まとめて買うほど安くなり、いちばん安くて120円です。サブスクではないので、使うときだけ買えば大丈夫です。',
      { img: 'guide-08-buy.jpg', w: 755, h: 545 },
    ],
  },
  {
    title: '6. 送る',
    body: [
      '「ピッチ作成へ」を押すと、曲の情報を入れる画面になります。入力はぜんぶ日本語でOKです。',
      '送るときに、AIがあなたの曲に合わせた英語の紹介文を自動で作ります。内容を確認したら、送信ボタンを押すだけです。',
      { img: 'guide-05-compose.jpg', w: 755, h: 758 },
    ],
  },
  {
    title: '7. 返事を読む・返す',
    body: [
      '送ったあとの様子は、「トラッキング」でいつでも見られます。',
      { img: 'guide-06-tracking.jpg', w: 755, h: 758 },
      'フィードバックが届くと、日本語訳が自動で付きます。原文を見ることもできます。「返信を書く」を押せば、日本語で書いた返事を英語のメールにできます。',
      { img: 'guide-07-feedback.jpg', w: 582, h: 424 },
      'もし期限（キュレーターごとに7日または14日）までに返事がなければ、使ったクレジットは全額自動で戻ります。送って損をすることはありません。',
    ],
  },
];

const WORRIES = [
  { q: '英語ができなくても大丈夫？', a: '大丈夫です。送る文章も、届く返事も、自動で翻訳されます。' },
  { q: '返事が来なかったら？', a: '期限までに返事がなければ、使ったクレジットは全額自動で戻ります。' },
  {
    q: '見送られたら、どうなる？',
    a: '見送りの場合も、理由やアドバイスがフィードバックとして届くことがあります。次の曲づくりのヒントになります。',
  },
];

const P = { fontSize: 16, lineHeight: 1.9, color: C.sub, margin: '0 0 14px' };

function Shot({ file, w, h, alt }) {
  return (
    <img
      src={`/guide/${file}`}
      alt={alt}
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      style={{
        display: 'block',
        width: '100%',
        maxWidth: Math.min(w, 760),
        height: 'auto',
        margin: '8px 0 22px',
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: '#fff',
      }}
    />
  );
}

export default function GuidePage() {
  return (
    <main className="guide-page" style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: D.fBody }}>
      <style>{'@media (min-width: 768px) { .guide-page h1, .guide-page h2 { word-break: keep-all; } }'}</style>
      <header style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px 0' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="32" height="32" viewBox="0 0 40 40" style={{ flexShrink: 0 }} aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="#FF6B4A" strokeWidth="5"/><g style={{ clipPath: 'circle(32.5% at 50% 50%)' }} fill="#FF6B4A"><rect x="8" y="17" width="2" height="6" rx="1"/><rect x="12" y="14" width="2" height="12" rx="1"/><rect x="16" y="11" width="2" height="18" rx="1"/><rect x="20" y="8" width="2" height="24" rx="1"/><rect x="24" y="11" width="2" height="18" rx="1"/><rect x="28" y="14" width="2" height="12" rx="1"/><rect x="32" y="17" width="2" height="6" rx="1"/></g></svg>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '3px', color: C.text }}>OTONAMI</span>
        </a>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 96px' }}>
        <section style={{ marginBottom: 56 }}>
          <h1 style={{ fontFamily: D.fHead, fontSize: 'clamp(30px, 6vw, 44px)', fontWeight: 700, lineHeight: 1.3, margin: '0 0 20px' }}>
            はじめてのピッチ送信ガイド
          </h1>
          <p style={{ ...P, fontSize: 17, color: C.text }}>
            曲を選んで、聴いてくれる相手を選んで、送る。やることはこれだけです。
            <br />
            このページの通りに進めば、最初の1曲を数分で送れます。
          </p>
        </section>

        {STEPS.map((s) => (
          <section key={s.title} style={{ paddingTop: 36, marginTop: 8, borderTop: `1px solid ${C.border}` }}>
            <h2 style={{ ...H2_SM, color: C.text, margin: '0 0 16px' }}>{s.title}</h2>
            {s.body.map((b, i) =>
              typeof b === 'string'
                ? <p key={i} style={P}>{b}</p>
                : <Shot key={i} file={b.img} w={b.w} h={b.h} alt={s.title} />
            )}
          </section>
        ))}

        <section style={{ paddingTop: 36, marginTop: 8, borderTop: `1px solid ${C.border}` }}>
          <h2 style={{ ...H2_SM, color: C.text, margin: '0 0 20px' }}>よくある不安</h2>
          {WORRIES.map((w) => (
            <div key={w.q} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 12 }}>
              <p style={{ ...P, margin: '0 0 6px', color: C.text }}><strong>{w.q}</strong></p>
              <p style={{ ...P, margin: 0 }}>{w.a}</p>
            </div>
          ))}
        </section>

        <section style={{ textAlign: 'center', paddingTop: 48, marginTop: 24, borderTop: `1px solid ${C.border}` }}>
          <h2 style={{ ...H2_SM, color: C.text, margin: '0 0 28px' }}>さあ、最初の1曲を送ってみましょう</h2>
          <a
            href="https://otonami.io/studio"
            className="cta-button"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px 40px', borderRadius: 100, background: C.accent, color: '#fff', boxSizing: 'border-box', maxWidth: '100%',
              fontWeight: 700, fontSize: 16, textDecoration: 'none', fontFamily: D.fBody,
            }}
          >
            ピッチを始める →
          </a>
          <p style={{ margin: '20px 0 0' }}>
            <a href="https://otonami.io/artist" style={{ color: C.accent, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              アカウントがまだの方はこちら →
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
