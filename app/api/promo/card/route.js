// app/api/promo/card/route.js
import { ImageResponse } from '@vercel/og';
import { selectPalette, getPaletteByName } from '@/lib/promo-palette';

export const runtime = 'edge';

/**
 * POST /api/promo/card
 *
 * Body JSON:
 * {
 *   template: 'new_release' | 'out_now' | 'streaming_now',
 *   format: 'feed' | 'story',
 *   trackTitle: string,
 *   artistName: string,
 *   releaseDate?: string (YYYY-MM-DD),
 *   genres?: string[],
 *   imageUrl?: string (ジャケ写/アー写のURL),
 *   palette?: string (手動指定: 'vivid'|'earth'|'neon'|'moody'|'warm'),
 *   audioFeatures?: { energy, danceability, acousticness, valence, moods, genres }
 * }
 *
 * Response: PNG image (image/png)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      template = 'new_release',
      format = 'feed',
      trackTitle = 'Untitled',
      artistName = 'Artist',
      releaseDate,
      genres = [],
      imageUrl,
      palette: paletteOverride,
      audioFeatures
    } = body;

    // パレット選択（手動指定 or 自動）
    const palette = paletteOverride
      ? getPaletteByName(paletteOverride)
      : selectPalette(audioFeatures || {});

    // フォーマットサイズ
    const width = 1080;
    const height = format === 'story' ? 1920 : 1080;

    // リリース日フォーマット
    const formattedDate = releaseDate
      ? new Date(releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    // ジャンルタグ（最大3つ）
    const genreTags = genres.slice(0, 3);

    // テンプレート別JSX生成
    const jsx = renderTemplate({
      template, format, width, height,
      trackTitle, artistName, formattedDate, genreTags,
      imageUrl, palette
    });

    return new ImageResponse(jsx, {
      width,
      height,
      headers: {
        'Content-Disposition': `inline; filename="otonami-${template}-${format}.png"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Promo card generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * テンプレート別のJSXを返す
 */
function renderTemplate({ template, format, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette }) {
  const isStory = format === 'story';

  const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
  };

  switch (template) {
    case 'out_now':
      return templateOutNow({ containerStyle, isStory, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette });
    case 'streaming_now':
      return templateStreamingNow({ containerStyle, isStory, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette });
    case 'new_release':
    default:
      return templateNewRelease({ containerStyle, isStory, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette });
  }
}

// ═══ Template 1: NEW RELEASE ═══
function templateNewRelease({ containerStyle, isStory, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette }) {
  const titleSize = isStory ? 60 : 52;
  const artistSize = isStory ? 26 : 22;

  return (
    <div style={{ ...containerStyle, background: palette.bg }}>
      {/* グラデーションメッシュ背景（3レイヤー重ね） */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        background: `radial-gradient(ellipse at 20% 80%, ${palette.accent}18 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${palette.accent}12 0%, transparent 40%), radial-gradient(ellipse at 50% 50%, ${palette.accent}06 0%, transparent 70%)`
      }} />

      {/* 装飾: 上部の細いアクセントライン */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
        display: 'flex', background: palette.gradient
      }} />

      {/* 装飾: コーナーの幾何学的サークル */}
      <div style={{
        position: 'absolute', top: isStory ? '80px' : '50px', right: isStory ? '50px' : '40px',
        width: isStory ? '120px' : '80px', height: isStory ? '120px' : '80px',
        borderRadius: '50%', border: `1.5px solid ${palette.accent}20`,
        display: 'flex'
      }} />
      <div style={{
        position: 'absolute', bottom: isStory ? '160px' : '100px', left: isStory ? '40px' : '30px',
        width: isStory ? '60px' : '40px', height: isStory ? '60px' : '40px',
        borderRadius: '50%', background: `${palette.accent}08`,
        display: 'flex'
      }} />

      {/* メインコンテンツ */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1,
        padding: isStory ? '100px 56px' : '70px 56px',
        position: 'relative', zIndex: 1
      }}>
        {/* NEW RELEASE ラベル — レタースペース広め */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: isStory ? '40px' : '28px'
        }}>
          <div style={{ width: '24px', height: '1.5px', background: palette.accent, display: 'flex' }} />
          <span style={{
            color: palette.accent, fontSize: 11, fontWeight: 600,
            letterSpacing: '4px', textTransform: 'uppercase'
          }}>
            New Release
          </span>
          <div style={{ width: '24px', height: '1.5px', background: palette.accent, display: 'flex' }} />
        </div>

        {/* ジャケ写 — 角丸+シャドウで立体感 */}
        {imageUrl ? (
          <div style={{
            display: 'flex', position: 'relative',
            marginBottom: isStory ? '48px' : '36px'
          }}>
            {/* シャドウレイヤー */}
            <div style={{
              position: 'absolute', inset: '8px',
              borderRadius: '20px', background: palette.accent,
              opacity: 0.15, filter: 'blur(30px)',
              display: 'flex'
            }} />
            <img
              src={imageUrl}
              width={isStory ? 400 : 320}
              height={isStory ? 400 : 320}
              style={{
                objectFit: 'cover',
                width: isStory ? '400px' : '320px',
                height: isStory ? '400px' : '320px',
                borderRadius: '20px',
                position: 'relative'
              }}
            />
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: isStory ? 400 : 320, height: isStory ? 400 : 320,
            borderRadius: '20px', marginBottom: isStory ? '48px' : '36px',
            background: `linear-gradient(135deg, ${palette.accent}12, ${palette.accent}06)`,
            border: `1px solid ${palette.accent}15`
          }}>
            <span style={{ fontSize: 64, opacity: 0.3 }}>♪</span>
          </div>
        )}

        {/* 曲名 — 大きく、太く、インパクト */}
        <span style={{
          color: palette.text, fontSize: titleSize, fontWeight: 800,
          textAlign: 'center', lineHeight: 1.1, marginBottom: '10px',
          maxWidth: '92%', letterSpacing: '-1px'
        }}>
          {trackTitle}
        </span>

        {/* アーティスト名 */}
        <span style={{
          color: palette.accent, fontSize: artistSize, fontWeight: 500,
          textAlign: 'center', marginBottom: '20px', letterSpacing: '1px'
        }}>
          {artistName}
        </span>

        {/* リリース日 + ジャンルを1行に */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {formattedDate && (
            <span style={{
              color: `${palette.text}50`, fontSize: 12, fontWeight: 400,
              letterSpacing: '1px', textTransform: 'uppercase'
            }}>
              {formattedDate}
            </span>
          )}
          {formattedDate && genreTags.length > 0 && (
            <span style={{ color: `${palette.text}20`, fontSize: 12, display: 'flex' }}>•</span>
          )}
          {genreTags.map((g, i) => (
            <span key={i} style={{
              color: `${palette.text}45`, fontSize: 12, fontWeight: 400,
              letterSpacing: '0.5px'
            }}>
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* フッター: OTONAMIブランド */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        paddingBottom: isStory ? '60px' : '36px', gap: '8px',
        position: 'relative', zIndex: 1
      }}>
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: palette.gradient, display: 'flex'
        }} />
        <span style={{
          color: `${palette.text}35`, fontSize: 11, fontWeight: 500,
          letterSpacing: '2.5px', textTransform: 'uppercase'
        }}>
          OTONAMI
        </span>
      </div>
    </div>
  );
}

// ═══ Template 2: OUT NOW ═══
function templateOutNow({ containerStyle, isStory, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette }) {
  const titleSize = isStory ? 80 : 72;

  return (
    <div style={{ ...containerStyle, background: palette.bg }}>
      {/* 背景画像ぼかし */}
      {imageUrl && (
        <div style={{ position: 'absolute', inset: '-20px', display: 'flex', overflow: 'hidden' }}>
          <img src={imageUrl} width={width + 40} height={height + 40}
            style={{ objectFit: 'cover', width: '100%', height: '100%', opacity: 0.2 }} />
        </div>
      )}
      {/* ダークオーバーレイ */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        background: `linear-gradient(180deg, ${palette.bg}f0 0%, ${palette.bg}dd 40%, ${palette.bg}f5 100%)`
      }} />
      {/* グラデーションメッシュ */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        background: `radial-gradient(ellipse at 30% 70%, ${palette.accent}15 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, ${palette.accent}10 0%, transparent 40%)`
      }} />

      {/* 装飾: 上下のアクセントライン */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', display: 'flex', background: palette.gradient }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', display: 'flex', background: palette.gradient }} />

      {/* メインコンテンツ — 中央寄せ */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1,
        padding: isStory ? '120px 48px' : '60px 48px',
        position: 'relative', zIndex: 1
      }}>
        {/* OUT NOW ラベル */}
        <span style={{
          color: palette.accent, fontSize: 13, fontWeight: 700,
          letterSpacing: '8px', textTransform: 'uppercase',
          marginBottom: '12px'
        }}>
          OUT NOW
        </span>

        {/* 装飾ライン */}
        <div style={{
          display: 'flex', width: '40px', height: '2px',
          background: palette.accent, marginBottom: isStory ? '48px' : '32px',
          borderRadius: '1px'
        }} />

        {/* 曲名 — 超大型タイポ */}
        <span style={{
          color: palette.text, fontSize: titleSize, fontWeight: 900,
          textAlign: 'center', lineHeight: 1.0, marginBottom: '16px',
          maxWidth: '95%', letterSpacing: '-2px',
          textShadow: `0 2px 40px ${palette.accent}20`
        }}>
          {trackTitle}
        </span>

        {/* アクセントライン（曲名の下） */}
        <div style={{
          display: 'flex', width: '60px', height: '3px',
          background: palette.gradient, marginBottom: '20px',
          borderRadius: '2px'
        }} />

        {/* アーティスト名 */}
        <span style={{
          color: palette.accent, fontSize: isStory ? 24 : 20, fontWeight: 500,
          textAlign: 'center', letterSpacing: '2px', marginBottom: '28px'
        }}>
          {artistName}
        </span>

        {/* ジャンルタグ */}
        {genreTags.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {genreTags.map((g, i) => (
              <span key={i} style={{
                color: `${palette.text}40`, fontSize: 11,
                letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 400
              }}>
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* フッター */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        paddingBottom: isStory ? '60px' : '36px', gap: '8px',
        position: 'relative', zIndex: 1
      }}>
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: palette.gradient, display: 'flex'
        }} />
        <span style={{
          color: `${palette.text}35`, fontSize: 11, fontWeight: 500,
          letterSpacing: '2.5px', textTransform: 'uppercase'
        }}>
          OTONAMI
        </span>
      </div>
    </div>
  );
}

// ═══ Template 3: STREAMING NOW ═══
function templateStreamingNow({ containerStyle, isStory, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette }) {
  const imageHeight = isStory ? Math.round(height * 0.55) : Math.round(height * 0.5);
  const titleSize = isStory ? 48 : 44;

  return (
    <div style={{ ...containerStyle, background: palette.bg }}>
      {/* 上半分: ジャケ写エリア */}
      <div style={{
        display: 'flex', position: 'relative',
        width: '100%', height: `${imageHeight}px`, overflow: 'hidden'
      }}>
        {imageUrl ? (
          <img src={imageUrl} width={width} height={imageHeight}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        ) : (
          <div style={{
            display: 'flex', width: '100%', height: '100%',
            alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${palette.accent}15, ${palette.accent}05)`
          }}>
            <span style={{ fontSize: 80, opacity: 0.15 }}>♪</span>
          </div>
        )}
        {/* 下部のフェード */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
          display: 'flex',
          background: `linear-gradient(0deg, ${palette.bg} 0%, transparent 100%)`
        }} />

        {/* 左上に STREAMING NOW バッジ */}
        <div style={{
          position: 'absolute', top: '24px', left: '24px',
          display: 'flex', alignItems: 'center', gap: '6px',
          background: `${palette.bg}cc`, backdropFilter: 'blur(12px)',
          padding: '8px 16px', borderRadius: '999px'
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#22c55e', display: 'flex'
          }} />
          <span style={{
            color: palette.text, fontSize: 10, fontWeight: 600,
            letterSpacing: '2px', textTransform: 'uppercase'
          }}>
            Streaming Now
          </span>
        </div>
      </div>

      {/* 下半分: テキストエリア */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        flex: 1, padding: isStory ? '20px 48px 60px' : '16px 48px 36px',
        justifyContent: 'center', alignItems: 'center',
        position: 'relative', zIndex: 1
      }}>
        {/* グラデーションメッシュ */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: `radial-gradient(ellipse at 50% 0%, ${palette.accent}10 0%, transparent 60%)`
        }} />

        {/* 曲名 */}
        <span style={{
          color: palette.text, fontSize: titleSize, fontWeight: 800,
          textAlign: 'center', lineHeight: 1.1, marginBottom: '8px',
          maxWidth: '95%', letterSpacing: '-1px', position: 'relative'
        }}>
          {trackTitle}
        </span>

        {/* アーティスト名 */}
        <span style={{
          color: palette.accent, fontSize: isStory ? 20 : 18, fontWeight: 500,
          textAlign: 'center', marginBottom: '20px', letterSpacing: '1px',
          position: 'relative'
        }}>
          {artistName}
        </span>

        {/* プラットフォーム表示 */}
        <div style={{
          display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center',
          position: 'relative'
        }}>
          {['Spotify', 'Apple Music', 'YouTube Music'].map((p, i) => (
            <span key={i} style={{
              color: `${palette.text}35`, fontSize: 11,
              letterSpacing: '1px', fontWeight: 400
            }}>
              {p}
            </span>
          ))}
        </div>

        {/* OTONAMIロゴ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginTop: 'auto', paddingTop: '20px', position: 'relative'
        }}>
          <div style={{
            width: '14px', height: '14px', borderRadius: '50%',
            background: palette.gradient, display: 'flex'
          }} />
          <span style={{
            color: `${palette.text}30`, fontSize: 10, fontWeight: 500,
            letterSpacing: '2px', textTransform: 'uppercase'
          }}>
            OTONAMI
          </span>
        </div>
      </div>
    </div>
  );
}
