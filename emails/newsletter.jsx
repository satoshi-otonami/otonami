import { Html, Head, Body } from 'react-email';

/**
 * OTONAMI Artist Newsletter vol.1 — react-email テンプレート
 *
 * 正本: ~/Desktop/otonami-newsletter-vol1-jp-v7-2.html （v7-2）
 * v7-2 からの「意図的な差分」は次の3箇所のみ（それ以外は忠実再現）:
 *   (1) ヘッダー帯 <td>       : bgcolor 属性を除去。背景色は inline style に維持（画像失敗時のフォールバックバー機能を保持）
 *   (2) マッチCTAボタン <td>  : bgcolor 属性・td側 background-color を除去。背景色は <a> のみに直書き
 *   (3) EPKボタン <td>        : 同上（<a> のみ #1a1a1a を直書き）
 * → メール実装ルール #1（Yahoo!が td bgcolor を剥がす問題）への対応。
 *
 * props:
 *   lang               'jp' | 'en'（現状は <html lang> 制御のみ。EN実コンテンツはPhase 2）
 *   subjectPreviewText 受信トレイのプレビュー文
 *   greeting           挨拶1行目（Broadcast: {{{FIRST_NAME|アーティスト}}} / 個別送信: 実名）
 *   curators           掲載キュレーター配列（name/avatarUrl/typeRegion/genres/accent/bio/forWhom/initials?）
 *   ctaLinks           { match, epk }
 *   mode               'broadcast'（既定・配信停止リンク）| 'personal'（リンク無し文言）
 *   unsubscribeUrl     Broadcast時の配信停止URL
 */

const SANS =
  "-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic',Meiryo,sans-serif";
const TAG_SANS = '-apple-system,sans-serif';
const NBSP = '\u00A0'; // &nbsp;
// v7-2 の preheader パディング（&zwnj;&nbsp; × 10）
const PREHEADER_PAD = '\u200C\u00A0'.repeat(10); // (zwnj + nbsp) x10

const DEFAULT_CTA = {
  match: 'https://otonami.io/studio',
  epk: 'https://otonami.io/dashboard/epk',
};

const DEFAULT_CURATORS = [
  {
    name: 'Rádio Armazém',
    avatarUrl:
      'https://jroudvjksouqnmlhzhzr.supabase.co/storage/v1/object/public/avatars/curator-radioarmazem-net-gmail-com-1782465156588.jpg',
    typeRegion: 'ラジオ・プレイリスト ・ ブラジル',
    genres: ['Jazz', 'Ambient', 'Lo-fi'],
    accent: { fg: '#c44a2f', bg: '#ffe7df' },
    bio: '2015年設立のブラジルのオンラインラジオ局。2025年には国内アワードで最優秀Webラジオに選ばれました。ジャズやクラシカル、アンビエントなどインスト系を好み、ドリーミーでノスタルジックなムードの楽曲を探しています。',
    forWhom: 'ジャズ／アンビエント／Lo-fiなど、静かな質感の楽曲を持つ方に。',
  },
  {
    name: 'Soft Piano for Reading',
    avatarUrl:
      'https://jroudvjksouqnmlhzhzr.supabase.co/storage/v1/object/public/avatars/curator-mnomusic-mac-com-1782400002023-sq112.jpg',
    typeRegion: 'プレイリスト ・ 米国',
    genres: ['Instrumental', 'Ambient'],
    accent: { fg: '#1f7a72', bg: '#ddf6f3' },
    bio: 'ネオクラシカルのピアニスト Michael Emenau が運営する、読書のためのピアノプレイリスト。「4分未満、温かいフェルトピアノの音色」の楽曲を探しています。対象はピアノインスト・アンビエントに絞られるぶん、該当する方はマッチ度が高いはずです。',
    forWhom: 'ピアノインスト／アンビエントの方に。',
  },
  {
    name: 'A2R SoundLabs',
    avatarUrl:
      'https://jroudvjksouqnmlhzhzr.supabase.co/storage/v1/object/public/avatars/curator-a2r-soundlabs-gmail-com-1782944137984-sq112.png',
    typeRegion: 'レーベル ・ スペイン',
    genres: ['Electronic', 'Instrumental', 'World'],
    accent: { fg: '#6d4ba6', bg: '#ece4fb' },
    bio: 'エレクトロニックを軸とする、スペインの音楽制作・サウンドデザインスタジオ。プレイリストやブログでの紹介に加えて、インタビューやレーベル機会にも開かれています。ジャンルは幅広く受け付けています。',
    forWhom: 'エレクトロ／インスト／ワールド系の方に。',
  },
];

// 38×4px のコーラルの見出しバー（キュレーター見出し / EPK / コツ で共通）
function AccentBar() {
  return (
    <table role="presentation" cellPadding="0" cellSpacing="0" border="0" style={{ margin: '0 0 9px 0' }}>
      <tbody>
        <tr>
          <td
            style={{
              width: '38px',
              height: '4px',
              backgroundColor: '#FF6B4A',
              fontSize: 0,
              lineHeight: 0,
              borderRadius: '2px',
              msoLineHeightRule: 'exactly',
            }}
          >
            {NBSP}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// 本体テーブル内の区切り線（tr を返す）
function Divider({ pad }) {
  return (
    <tr>
      <td style={{ padding: pad }}>
        <div style={{ height: '1px', backgroundColor: '#f0e9de', lineHeight: '1px', fontSize: 0 }}>{NBSP}</div>
      </td>
    </tr>
  );
}

function deriveInitials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  const chars = parts.slice(0, 2).map((p) => p.charAt(0));
  return chars.join('').toUpperCase() || 'OT';
}

// キュレーターカード1枚（tr を返す）。avatarUrl 未設定時はコーラルのイニシャル円にフォールバック。
function CuratorCard({ curator, index }) {
  const { name, avatarUrl, typeRegion, genres = [], accent, bio, forWhom, initials } = curator;
  return (
    <tr>
      <td style={{ padding: index === 0 ? '16px 32px 0 32px' : '12px 32px 0 32px' }}>
        <table
          role="presentation"
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          border="0"
          style={{ backgroundColor: '#FDF9F2', border: '1px solid #f0e9de', borderRadius: '12px' }}
        >
          <tbody>
            <tr>
              <td width="64" valign="top" style={{ padding: '16px 0 16px 16px' }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    width="56"
                    height="56"
                    alt={name}
                    style={{
                      display: 'block',
                      width: '56px',
                      height: '56px',
                      minWidth: '56px',
                      minHeight: '56px',
                      maxWidth: '56px',
                      maxHeight: '56px',
                      borderRadius: '50%',
                      border: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      lineHeight: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#FF6B4A',
                      color: '#ffffff',
                      fontFamily: SANS,
                      fontSize: '18px',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    {initials || deriveInitials(name)}
                  </div>
                )}
              </td>
              <td valign="top" style={{ padding: '16px', fontFamily: SANS }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>{name}</p>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#8a8276' }}>{typeRegion}</p>
                <p style={{ margin: 0, fontSize: 0, lineHeight: 0 }}>
                  {genres.map((g, gi) => (
                    <span
                      key={gi}
                      style={{
                        display: 'inline-block',
                        fontFamily: TAG_SANS,
                        fontSize: '12px',
                        color: accent.fg,
                        backgroundColor: accent.bg,
                        borderRadius: '6px',
                        padding: '3px 9px',
                        margin: '0 6px 6px 0',
                      }}
                    >
                      {g}
                    </span>
                  ))}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', lineHeight: 1.65, color: '#5a5347', fontFamily: SANS }}>
                  {bio}
                </p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', lineHeight: 1.5, color: '#c44a2f', fontFamily: SANS }}>
                  {forWhom}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

export function Newsletter({
  lang = 'jp',
  subjectPreviewText = '新しいキュレーターが参加しました。あなたの楽曲に合う相手が、見つかりやすくなってきました。',
  greeting = '{{{FIRST_NAME|アーティスト}}}さん、こんにちは。',
  curators = DEFAULT_CURATORS,
  ctaLinks = DEFAULT_CTA,
  mode = 'broadcast',
  unsubscribeUrl = '{{{RESEND_UNSUBSCRIBE_URL}}}',
} = {}) {
  const htmlLang = lang === 'en' ? 'en' : 'ja';
  return (
    <Html lang={htmlLang}>
      <Head>
        <title>OTONAMI通信 vol.1</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Body style={{ margin: 0, padding: 0, background: '#FDF9F2' }}>
        {/* preheader（受信トレイ プレビュー） */}
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden', msoHide: 'all' }}>
          {subjectPreviewText}
          {PREHEADER_PAD}
        </div>

        <table
          role="presentation"
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          border="0"
          style={{ backgroundColor: '#FDF9F2', margin: 0, padding: 0 }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: '16px' }}>
                {/* ===== 本体 600px ===== */}
                <table
                  role="presentation"
                  width="600"
                  cellPadding="0"
                  cellSpacing="0"
                  border="0"
                  style={{
                    width: '600px',
                    maxWidth: '600px',
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid #f0e9de',
                  }}
                >
                  <tbody>
                    {/* ヘッダーバナー（意図的差分(1): bgcolor 属性を除去、背景色は inline style に維持） */}
                    <tr>
                      <td align="center" style={{ backgroundColor: '#FF6B4A', lineHeight: 0 }}>
                        <img
                          src="https://jroudvjksouqnmlhzhzr.supabase.co/storage/v1/object/public/assets/newsletter/header.png"
                          width="600"
                          alt="OTONAMI — Connect Japanese Music to the World"
                          style={{
                            display: 'block',
                            width: '100%',
                            maxWidth: '600px',
                            height: 'auto',
                            border: 0,
                            outline: 'none',
                            textDecoration: 'none',
                          }}
                        />
                      </td>
                    </tr>

                    {/* 挨拶 */}
                    <tr>
                      <td style={{ padding: '32px 32px 8px 32px', fontFamily: SANS }}>
                        <p style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.6 }}>
                          {greeting}
                        </p>
                        <p style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#3a3a3a', lineHeight: 1.85 }}>
                          OTONAMI事務局です。いつもOTONAMIを使ってくださって、ありがとうございます。
                        </p>
                        <p style={{ margin: 0, fontSize: '15px', color: '#3a3a3a', lineHeight: 1.85 }}>
                          ここ最近、海外のキュレーター（プレイリスト運営者・ブロガー・ラジオDJなど）が新しく何組か参加してくれました。受け入れジャンルの幅も少しずつ広がってきて、あなたの楽曲に合う相手が見つかりやすくなってきたと思います。今月は、その中から数組をご紹介します。
                        </p>
                      </td>
                    </tr>

                    <Divider pad="24px 32px 0 32px" />

                    {/* セクション見出し */}
                    <tr>
                      <td style={{ padding: '24px 32px 4px 32px', fontFamily: SANS }}>
                        <AccentBar />
                        <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '.01em', fontFamily: SANS }}>
                          最近参加したキュレーター
                        </p>
                      </td>
                    </tr>

                    {/* キュレーターカード */}
                    {curators.map((c, i) => (
                      <CuratorCard key={i} curator={c} index={i} />
                    ))}

                    {/* マッチCTA */}
                    <tr>
                      <td style={{ padding: '24px 32px 4px 32px', fontFamily: SANS }}>
                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#3a3a3a', lineHeight: 1.8 }}>
                          あなたの楽曲との相性は、ダッシュボードの
                          <strong style={{ color: '#1a1a1a' }}>マッチスコア</strong>
                          で確認できます。相性の高い相手から順に表示されます。
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: '0 32px 8px 32px' }}>
                        <table role="presentation" cellPadding="0" cellSpacing="0" border="0" align="center">
                          <tbody>
                            <tr>
                              {/* 意図的差分(2): td bgcolor・td背景色を除去。背景色は <a> のみに直書き */}
                              <td align="center" style={{ borderRadius: '10px' }}>
                                <a
                                  href={ctaLinks.match}
                                  target="_blank"
                                  style={{
                                    display: 'inline-block',
                                    padding: '15px 34px',
                                    fontFamily: SANS,
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    backgroundColor: '#FF6B4A',
                                    textDecoration: 'none',
                                    borderRadius: '10px',
                                  }}
                                >
                                  マッチするキュレーターを見る →
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: '6px 32px 0 32px' }}>
                        <a
                          href="https://otonami.io/curators"
                          target="_blank"
                          style={{ fontFamily: SANS, fontSize: '13px', color: '#8a8276', textDecoration: 'underline' }}
                        >
                          参加中のキュレーター一覧を見る
                        </a>
                      </td>
                    </tr>

                    <Divider pad="28px 32px 0 32px" />

                    {/* EPKブロック */}
                    <tr>
                      <td style={{ padding: '28px 32px 0 32px' }}>
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding="0"
                          cellSpacing="0"
                          border="0"
                          style={{ backgroundColor: '#fff6ef', border: '1px solid #ffe0d4', borderRadius: '12px' }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: '22px', fontFamily: SANS }}>
                                <AccentBar />
                                <p style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '.01em', fontFamily: SANS }}>
                                  無料で「公式アーティストページ（EPK）」を作れます
                                </p>
                                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#3a3a3a', lineHeight: 1.8 }}>
                                  プロフィール・楽曲・写真・各種リンクをまとめた公式ページを、OTONAMI上で無料で作成できます。キュレーターへのピッチや、SNSのプロフィールリンクにそのまま使えると思います。
                                </p>
                                <table role="presentation" cellPadding="0" cellSpacing="0" border="0">
                                  <tbody>
                                    <tr>
                                      {/* 意図的差分(3): td bgcolor・td背景色を除去。背景色は <a> のみに直書き */}
                                      <td align="center" style={{ borderRadius: '8px' }}>
                                        <a
                                          href={ctaLinks.epk}
                                          target="_blank"
                                          style={{
                                            display: 'inline-block',
                                            padding: '11px 22px',
                                            fontFamily: SANS,
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: '#ffffff',
                                            backgroundColor: '#1a1a1a',
                                            textDecoration: 'none',
                                            borderRadius: '8px',
                                          }}
                                        >
                                          EPKページを作る
                                        </a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <p style={{ margin: '14px 0 0 0', fontSize: '12px', color: '#8a8276' }}>
                                  例：
                                  <a
                                    href="https://otonami.io/epk/route14band"
                                    target="_blank"
                                    style={{ color: '#FF6B4A', textDecoration: 'underline' }}
                                  >
                                    ROUTE14band のEPKページ
                                  </a>
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* ピッチのコツ */}
                    <tr>
                      <td style={{ padding: '28px 32px 0 32px', fontFamily: SANS }}>
                        <AccentBar />
                        <p style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '.01em', fontFamily: SANS }}>
                          ピッチが届きやすくなるコツ
                        </p>
                        <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#3a3a3a', lineHeight: 1.8 }}>
                          ・ 楽曲の<strong style={{ color: '#1a1a1a' }}>ジャンルとムードのタグ</strong>は、できるだけ正確に。マッチングの精度が上がります。
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#3a3a3a', lineHeight: 1.8 }}>
                          ・ 1〜2行でいいので<strong style={{ color: '#1a1a1a' }}>曲の背景やおすすめポイント</strong>を添えると、返信がもらいやすくなる傾向があります。
                        </p>
                      </td>
                    </tr>

                    {/* 結び */}
                    <tr>
                      <td style={{ padding: '28px 32px 0 32px', fontFamily: SANS }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#3a3a3a', lineHeight: 1.85 }}>
                          また来月、新しいキュレーターやアップデートをお届けします。気軽に使ってもらえたら嬉しいです。
                        </p>
                        <p style={{ margin: '16px 0 0 0', fontSize: '14px', color: '#1a1a1a', lineHeight: 1.7 }}>OTONAMI事務局</p>
                      </td>
                    </tr>

                    {/* フッター */}
                    <tr>
                      <td style={{ padding: '28px 32px 32px 32px' }}>
                        <div style={{ height: '1px', backgroundColor: '#f0e9de', lineHeight: '1px', fontSize: 0, marginBottom: '20px' }}>{NBSP}</div>
                        <p style={{ margin: '0 0 4px 0', fontFamily: SANS, fontSize: '12px', fontWeight: 700, color: '#1a1a1a' }}>
                          OTONAMI — Connect Japanese Music to the World
                        </p>
                        <p style={{ margin: '0 0 14px 0', fontFamily: SANS, fontSize: '11px', color: '#9a9286', lineHeight: 1.7 }}>
                          運営：TYCompany合同会社
                        </p>
                        <p style={{ margin: 0, fontFamily: SANS, fontSize: '11px', color: '#9a9286', lineHeight: 1.7 }}>
                          <a href="https://otonami.io" target="_blank" style={{ color: '#9a9286', textDecoration: 'underline' }}>
                            otonami.io
                          </a>
                          {'\u00A0\u30FB\u00A0'}
                          <a href="https://otonami.io/tokushoho" target="_blank" style={{ color: '#9a9286', textDecoration: 'underline' }}>
                            特定商取引法に基づく表記
                          </a>
                          {'\u00A0\u30FB\u00A0'}
                          {mode === 'personal' ? (
                            'やめたい時は、いつでも一言ください。'
                          ) : (
                            <a href={unsubscribeUrl} target="_blank" style={{ color: '#9a9286', textDecoration: 'underline' }}>
                              配信を停止する
                            </a>
                          )}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {/* ===== /本体 ===== */}
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

export default Newsletter;
