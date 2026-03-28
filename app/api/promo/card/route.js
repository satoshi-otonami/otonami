// app/api/promo/card/route.js
import { ImageResponse } from '@vercel/og';
import { selectPalette, getPaletteByName } from '@/lib/promo-palette';

export const runtime = 'edge';

/**
 * POST /api/promo/card
 *
 * Body JSON:
 * {
 *   template: 'player' | 'vinyl' | 'live',
 *   format: 'feed' | 'story',
 *   trackTitle: string,
 *   artistName: string,
 *   releaseDate?: string (YYYY-MM-DD),
 *   genres?: string[],
 *   imageUrl?: string (ジャケ写/アー写のURL),
 *   palette?: string (手動指定: 'vivid'|'earth'|'neon'|'moody'|'warm'),
 *   audioFeatures?: { energy, danceability, acousticness, valence, moods, genres },
 *   duration?: string ("3:42" 形式)
 * }
 *
 * Response: PNG image (image/png)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      template = 'player',
      format = 'feed',
      trackTitle = 'Untitled',
      artistName = 'Artist',
      releaseDate,
      genres = [],
      imageUrl,
      palette: paletteOverride,
      audioFeatures,
      duration
    } = body;

    const palette = paletteOverride
      ? getPaletteByName(paletteOverride)
      : selectPalette(audioFeatures || {});

    const width = 1080;
    const height = format === 'story' ? 1920 : 1080;

    const formattedDate = releaseDate
      ? new Date(releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    const genreTags = genres.slice(0, 3);
    const trackDuration = duration || '3:42';

    const props = {
      width, height, format,
      trackTitle, artistName, formattedDate, genreTags,
      imageUrl, palette, trackDuration,
      isStory: format === 'story'
    };

    let jsx;
    switch (template) {
      case 'vinyl':
        jsx = templateVinyl(props);
        break;
      case 'live':
        jsx = templateLive(props);
        break;
      case 'player':
      default:
        jsx = templatePlayer(props);
        break;
    }

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

// ════════════════════════════════════════════
// Template 1: PLAYER — 音楽プレーヤーUI風
// ════════════════════════════════════════════
function templatePlayer({ width, height, isStory, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette, trackDuration }) {
  const panelW = isStory ? 880 : 760;
  const artSize = isStory ? 320 : 280;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', fontFamily: '"DM Sans", "Helvetica Neue", sans-serif' }}>

      {/* 背景: ジャケ写拡大（疑似ぼかし） */}
      {imageUrl ? (
        <img src={imageUrl} width={Math.round(width * 1.3)} height={Math.round(height * 1.3)}
          style={{
            position: 'absolute',
            top: '-15%', left: '-15%',
            width: '130%', height: '130%',
            objectFit: 'cover', opacity: 0.5
          }} />
      ) : null}

      {/* ダークオーバーレイ */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        background: `linear-gradient(160deg, ${palette.bg}e0 0%, ${palette.accent}30 50%, ${palette.bg}f0 100%)`
      }} />

      {/* グラデーションメッシュ */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        background: `radial-gradient(ellipse at 30% 20%, ${palette.accent}15 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, ${palette.accent}10 0%, transparent 50%)`
      }} />

      {/* メインコンテンツ — 中央にプレーヤーパネル */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', width: '100%', height: '100%',
        position: 'relative', zIndex: 1
      }}>

        {/* グラスモーフィズム風パネル */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: `${panelW}px`,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '32px',
          padding: isStory ? '48px 40px' : '40px 36px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}>

          {/* ジャケ写 */}
          {imageUrl ? (
            <img src={imageUrl} width={artSize} height={artSize}
              style={{
                width: `${artSize}px`, height: `${artSize}px`,
                borderRadius: '24px', objectFit: 'cover',
                boxShadow: `0 16px 48px ${palette.accent}40`,
                marginBottom: '28px'
              }} />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: `${artSize}px`, height: `${artSize}px`,
              borderRadius: '24px', marginBottom: '28px',
              background: `linear-gradient(135deg, ${palette.accent}20, ${palette.accent}08)`,
              border: `1px solid ${palette.accent}20`
            }}>
              <span style={{ fontSize: 72, opacity: 0.3 }}>♪</span>
            </div>
          )}

          {/* 曲名 */}
          <span style={{
            color: '#ffffff', fontSize: isStory ? 36 : 32, fontWeight: 800,
            textAlign: 'center', lineHeight: 1.2, marginBottom: '6px',
            maxWidth: '95%', letterSpacing: '-0.5px'
          }}>
            {trackTitle}
          </span>

          {/* アーティスト名 */}
          <span style={{
            color: 'rgba(255,255,255,0.6)', fontSize: isStory ? 20 : 18, fontWeight: 400,
            textAlign: 'center', marginBottom: '28px'
          }}>
            {artistName}
          </span>

          {/* プログレスバー — SVG */}
          <div style={{ display: 'flex', width: '100%', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            <svg width={panelW - 80} height="6" viewBox={`0 0 ${panelW - 80} 6`}>
              <rect x="0" y="0" width={panelW - 80} height="6" rx="3" fill="rgba(255,255,255,0.15)" />
              <rect x="0" y="0" width={Math.round((panelW - 80) * 0.35)} height="6" rx="3" fill={palette.accent} />
              <circle cx={Math.round((panelW - 80) * 0.35)} cy="3" r="8" fill={palette.accent} />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: `${panelW - 80}px`, marginTop: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 400 }}>1:18</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 400 }}>{trackDuration}</span>
            </div>
          </div>

          {/* 再生コントロール — SVG */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
            {/* シャッフル */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 4l3 3-3 3M18 20l3-3-3-3M2 8h6l6 8h5M2 16h6l2.5-3.5" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* 前の曲 */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
              <path d="M19 20L9 12l10-8v16zM5 19V5"/>
            </svg>
            {/* 再生ボタン（大） */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill={palette.bg}>
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            {/* 次の曲 */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
              <path d="M5 4l10 8-10 8V4zM19 5v14"/>
            </svg>
            {/* リピート */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* OTONAMI ブランド */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginTop: isStory ? '48px' : '32px'
        }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: palette.accent, display: 'flex' }} />
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 500, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            OTONAMI
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Template 2: VINYL — レコードプレーヤー風
// Feed=左右分割、Story=上下分割
// ════════════════════════════════════════════
function templateVinyl({ width, height, isStory, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette, trackDuration }) {
  const artSize = isStory ? 560 : 420;

  if (isStory) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: palette.bg, fontFamily: '"DM Sans", "Helvetica Neue", sans-serif' }}>

        {/* グラデーションメッシュ背景 */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: `radial-gradient(ellipse at 50% 30%, ${palette.accent}12 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, ${palette.accent}08 0%, transparent 50%)`
        }} />

        {/* 上部: ジャケ写エリア */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '80px 60px 40px', position: 'relative', zIndex: 1
        }}>
          {imageUrl ? (
            <div style={{ display: 'flex', position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: '12px', borderRadius: '24px',
                background: palette.accent, opacity: 0.2, display: 'flex'
              }} />
              <img src={imageUrl} width={artSize} height={artSize}
                style={{
                  width: `${artSize}px`, height: `${artSize}px`,
                  borderRadius: '24px', objectFit: 'cover', position: 'relative'
                }} />
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: `${artSize}px`, height: `${artSize}px`, borderRadius: '24px',
              background: `${palette.accent}10`, border: `1px solid ${palette.accent}15`
            }}>
              <span style={{ fontSize: 80, opacity: 0.2 }}>♪</span>
            </div>
          )}
        </div>

        {/* 下部: テキスト + プレーヤーUI */}
        <div style={{
          display: 'flex', flexDirection: 'column', flex: 1,
          padding: '20px 60px 80px', alignItems: 'center',
          position: 'relative', zIndex: 1
        }}>
          {/* NEW RELEASE ラベル */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '20px', height: '1.5px', background: palette.accent, display: 'flex' }} />
            <span style={{ color: palette.accent, fontSize: 11, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase' }}>
              New Release
            </span>
            <div style={{ width: '20px', height: '1.5px', background: palette.accent, display: 'flex' }} />
          </div>

          {/* 曲名 */}
          <span style={{
            color: palette.text, fontSize: 48, fontWeight: 800,
            textAlign: 'center', lineHeight: 1.1, marginBottom: '8px',
            maxWidth: '95%', letterSpacing: '-1px'
          }}>
            {trackTitle}
          </span>

          {/* アーティスト名 */}
          <span style={{
            color: palette.accent, fontSize: 22, fontWeight: 500,
            textAlign: 'center', marginBottom: '36px', letterSpacing: '1px'
          }}>
            {artistName}
          </span>

          {/* ミニプレーヤー */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80%' }}>
            <svg width="600" height="6" viewBox="0 0 600 6">
              <rect x="0" y="0" width="600" height="6" rx="3" fill={`${palette.text}15`} />
              <rect x="0" y="0" width="210" height="6" rx="3" fill={palette.accent} />
              <circle cx="210" cy="3" r="8" fill={palette.accent} />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '600px', marginTop: '8px' }}>
              <span style={{ color: `${palette.text}35`, fontSize: 12 }}>1:18</span>
              <span style={{ color: `${palette.text}35`, fontSize: 12 }}>{trackDuration}</span>
            </div>
          </div>

          {/* 再生ボタン列 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginTop: '20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={`${palette.text}40`}>
              <path d="M19 20L9 12l10-8v16zM5 19V5"/>
            </svg>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '56px', height: '56px', borderRadius: '50%',
              background: palette.accent
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={`${palette.text}40`}>
              <path d="M5 4l10 8-10 8V4zM19 5v14"/>
            </svg>
          </div>

          {/* ジャンルタグ */}
          {genreTags.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {genreTags.map((g, i) => (
                <span key={i} style={{
                  color: `${palette.text}35`, fontSize: 11,
                  letterSpacing: '1.5px', textTransform: 'uppercase'
                }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* OTONAMIロゴ */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '6px', paddingBottom: '40px', position: 'relative', zIndex: 1
        }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: palette.accent, display: 'flex' }} />
          <span style={{ color: `${palette.text}25`, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase' }}>OTONAMI</span>
        </div>
      </div>
    );
  }

  // Feed: 横型 — 左にジャケ写、右にテキスト
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: palette.bg, fontFamily: '"DM Sans", "Helvetica Neue", sans-serif' }}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        background: `radial-gradient(ellipse at 80% 50%, ${palette.accent}12 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, ${palette.accent}06 0%, transparent 50%)`
      }} />

      {/* 左: ジャケ写 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '50%', padding: '60px', position: 'relative', zIndex: 1
      }}>
        {imageUrl ? (
          <div style={{ display: 'flex', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '10px', borderRadius: '20px', background: palette.accent, opacity: 0.15, display: 'flex' }} />
            <img src={imageUrl} width={artSize} height={artSize}
              style={{ width: `${artSize}px`, height: `${artSize}px`, borderRadius: '20px', objectFit: 'cover', position: 'relative' }} />
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: `${artSize}px`, height: `${artSize}px`, borderRadius: '20px',
            background: `${palette.accent}10`
          }}>
            <span style={{ fontSize: 64, opacity: 0.2 }}>♪</span>
          </div>
        )}
      </div>

      {/* 右: テキスト + プレーヤー */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        width: '50%', padding: '60px 60px 60px 0', position: 'relative', zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '20px', height: '1.5px', background: palette.accent, display: 'flex' }} />
          <span style={{ color: palette.accent, fontSize: 11, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase' }}>New Release</span>
        </div>

        <span style={{
          color: palette.text, fontSize: 44, fontWeight: 800,
          lineHeight: 1.1, marginBottom: '8px', letterSpacing: '-1px'
        }}>
          {trackTitle}
        </span>

        <span style={{
          color: palette.accent, fontSize: 20, fontWeight: 500,
          marginBottom: '32px', letterSpacing: '0.5px'
        }}>
          {artistName}
        </span>

        {/* ミニプレーヤー */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: '20px' }}>
          <svg width="380" height="6" viewBox="0 0 380 6">
            <rect x="0" y="0" width="380" height="6" rx="3" fill={`${palette.text}15`} />
            <rect x="0" y="0" width="133" height="6" rx="3" fill={palette.accent} />
            <circle cx="133" cy="3" r="7" fill={palette.accent} />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px', marginTop: '6px' }}>
            <span style={{ color: `${palette.text}35`, fontSize: 11 }}>1:18</span>
            <span style={{ color: `${palette.text}35`, fontSize: 11 }}>{trackDuration}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={`${palette.text}40`}><path d="M19 20L9 12l10-8v16zM5 19V5"/></svg>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '50%', background: palette.accent
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={`${palette.text}40`}><path d="M5 4l10 8-10 8V4zM19 5v14"/></svg>
        </div>

        {genreTags.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {genreTags.map((g, i) => (
              <span key={i} style={{ color: `${palette.text}30`, fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{g}</span>
            ))}
          </div>
        )}
      </div>

      {/* OTONAMIロゴ */}
      <div style={{
        position: 'absolute', bottom: '28px', left: '0', right: '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
      }}>
        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: palette.accent, display: 'flex' }} />
        <span style={{ color: `${palette.text}20`, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase' }}>OTONAMI</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Template 3: LIVE — ライブ写真全面 + グラスパネル
// ════════════════════════════════════════════
function templateLive({ width, height, isStory, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette, trackDuration }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', fontFamily: '"DM Sans", "Helvetica Neue", sans-serif' }}>

      {/* 背景写真フル */}
      {imageUrl ? (
        <img src={imageUrl} width={width} height={height}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', background: palette.bg }} />
      )}

      {/* グラデーションオーバーレイ（下が暗く） */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.75) 100%)'
      }} />

      {/* 上部にサイトURL */}
      <div style={{
        position: 'absolute', top: '32px', left: '0', right: '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(0,0,0,0.3)', padding: '6px 16px', borderRadius: '999px'
        }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: palette.accent, display: 'flex' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase' }}>otonami.io</span>
        </div>
      </div>

      {/* 下部: グラスパネル */}
      <div style={{
        position: 'absolute',
        bottom: isStory ? '80px' : '48px',
        left: isStory ? '7.5%' : '10%',
        right: isStory ? '7.5%' : '10%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: '28px',
        padding: isStory ? '36px 32px' : '32px 28px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        {/* 曲名 + アーティスト */}
        <span style={{
          color: '#ffffff', fontSize: isStory ? 32 : 28, fontWeight: 800,
          textAlign: 'center', lineHeight: 1.2, marginBottom: '4px',
          maxWidth: '95%'
        }}>
          {trackTitle}
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.6)', fontSize: isStory ? 18 : 16, fontWeight: 400,
          textAlign: 'center', marginBottom: '24px'
        }}>
          {artistName}
        </span>

        {/* プログレスバー */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '90%', marginBottom: '16px' }}>
          <svg width="500" height="4" viewBox="0 0 500 4">
            <rect x="0" y="0" width="500" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
            <rect x="0" y="0" width="175" height="4" rx="2" fill="#ffffff" />
            <circle cx="175" cy="2" r="6" fill="#ffffff" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>1:18</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{trackDuration}</span>
          </div>
        </div>

        {/* 再生コントロール */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><path d="M19 20L9 12l10-8v16zM5 19V5"/></svg>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '50%', background: '#ffffff'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><path d="M5 4l10 8-10 8V4zM19 5v14"/></svg>
        </div>
      </div>
    </div>
  );
}
