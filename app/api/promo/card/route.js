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
  const titleSize = isStory ? 64 : 56;
  const artistSize = isStory ? 28 : 24;

  return (
    <div style={{ ...containerStyle, background: palette.bg }}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        background: palette.gradient, opacity: 0.15
      }} />

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
        flex: 1, padding: isStory ? '120px 60px' : '80px 60px',
        position: 'relative', zIndex: 1
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: palette.tagBg, borderRadius: '999px',
          padding: '8px 24px', marginBottom: '32px',
          border: `1px solid ${palette.accent}40`
        }}>
          <span style={{ color: palette.accent, fontSize: 14, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
            ♪ New Release
          </span>
        </div>

        {imageUrl ? (
          <div style={{
            display: 'flex', width: isStory ? 480 : 400, height: isStory ? 480 : 400,
            borderRadius: '16px', overflow: 'hidden', marginBottom: '40px',
            boxShadow: `0 20px 60px ${palette.accent}30`
          }}>
            <img
              src={imageUrl}
              width={isStory ? 480 : 400}
              height={isStory ? 480 : 400}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: isStory ? 480 : 400, height: isStory ? 480 : 400,
            borderRadius: '16px', marginBottom: '40px',
            background: `${palette.accent}15`, border: `2px dashed ${palette.accent}40`
          }}>
            <span style={{ fontSize: 80, opacity: 0.5 }}>🎵</span>
          </div>
        )}

        <span style={{
          color: palette.text, fontSize: titleSize, fontWeight: 700,
          textAlign: 'center', lineHeight: 1.2, marginBottom: '12px',
          maxWidth: '90%'
        }}>
          {trackTitle}
        </span>

        <span style={{
          color: palette.accent, fontSize: artistSize, fontWeight: 500,
          textAlign: 'center', marginBottom: '24px'
        }}>
          {artistName}
        </span>

        {formattedDate && (
          <span style={{
            color: `${palette.text}80`, fontSize: 16, fontWeight: 400,
            marginBottom: '24px'
          }}>
            {formattedDate}
          </span>
        )}

        {genreTags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {genreTags.map((g, i) => (
              <span key={i} style={{
                background: palette.tagBg, color: palette.tagText,
                padding: '6px 16px', borderRadius: '999px', fontSize: 13,
                fontWeight: 500, border: `1px solid ${palette.accent}30`
              }}>
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', paddingBottom: '40px',
        position: 'relative', zIndex: 1
      }}>
        <span style={{ color: `${palette.text}30`, fontSize: 12, letterSpacing: '3px', textTransform: 'uppercase' }}>
          otonami.io
        </span>
      </div>
    </div>
  );
}

// ═══ Template 2: OUT NOW ═══
function templateOutNow({ containerStyle, isStory, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette }) {
  const titleSize = isStory ? 72 : 64;
  const artistSize = isStory ? 32 : 28;

  return (
    <div style={{ ...containerStyle, background: palette.bg }}>
      {imageUrl && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <img src={imageUrl} width={width} height={height} style={{ objectFit: 'cover', width: '100%', height: '100%', opacity: 0.3 }} />
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', background: `${palette.bg}cc` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', background: palette.gradient, opacity: 0.08 }} />

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1,
        padding: isStory ? '120px 60px' : '80px 60px',
        position: 'relative', zIndex: 1
      }}>
        <span style={{
          color: palette.accent, fontSize: 18, fontWeight: 700,
          letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '24px'
        }}>
          OUT NOW
        </span>

        <div style={{ display: 'flex', width: '60px', height: '3px', background: palette.accent, marginBottom: '40px', borderRadius: '2px' }} />

        <span style={{
          color: palette.text, fontSize: titleSize, fontWeight: 700,
          textAlign: 'center', lineHeight: 1.1, marginBottom: '20px',
          maxWidth: '90%'
        }}>
          {trackTitle}
        </span>

        <span style={{
          color: palette.accent, fontSize: artistSize, fontWeight: 500,
          textAlign: 'center', marginBottom: '32px'
        }}>
          {artistName}
        </span>

        {formattedDate && (
          <span style={{
            color: `${palette.text}60`, fontSize: 15, fontWeight: 400, marginBottom: '28px'
          }}>
            {formattedDate}
          </span>
        )}

        {genreTags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {genreTags.map((g, i) => (
              <span key={i} style={{
                background: palette.tagBg, color: palette.tagText,
                padding: '6px 16px', borderRadius: '999px', fontSize: 13,
                fontWeight: 500
              }}>
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '40px', position: 'relative', zIndex: 1 }}>
        <span style={{ color: `${palette.text}30`, fontSize: 12, letterSpacing: '3px', textTransform: 'uppercase' }}>otonami.io</span>
      </div>
    </div>
  );
}

// ═══ Template 3: STREAMING NOW ═══
function templateStreamingNow({ containerStyle, isStory, width, height, trackTitle, artistName, formattedDate, genreTags, imageUrl, palette }) {
  const titleSize = isStory ? 56 : 48;
  const artistSize = isStory ? 26 : 22;

  return (
    <div style={{ ...containerStyle, background: palette.bg }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', background: palette.gradient, opacity: 0.1 }} />

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1,
        padding: isStory ? '120px 60px' : '80px 60px',
        position: 'relative', zIndex: 1
      }}>
        {imageUrl && (
          <div style={{
            display: 'flex', width: isStory ? 280 : 240, height: isStory ? 280 : 240,
            borderRadius: '12px', overflow: 'hidden', marginBottom: '32px',
            boxShadow: `0 12px 40px ${palette.accent}25`
          }}>
            <img src={imageUrl} width={isStory ? 280 : 240} height={isStory ? 280 : 240} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          </div>
        )}

        <span style={{
          color: palette.text, fontSize: titleSize, fontWeight: 700,
          textAlign: 'center', lineHeight: 1.2, marginBottom: '8px', maxWidth: '90%'
        }}>
          {trackTitle}
        </span>

        <span style={{
          color: palette.accent, fontSize: artistSize, fontWeight: 500,
          textAlign: 'center', marginBottom: '32px'
        }}>
          {artistName}
        </span>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: palette.tagBg, borderRadius: '12px',
          padding: '16px 32px', marginBottom: '24px',
          border: `1px solid ${palette.accent}30`
        }}>
          <span style={{ color: palette.accent, fontSize: 15, fontWeight: 600 }}>
            🎧 Streaming Now on All Platforms
          </span>
        </div>

        <span style={{
          color: `${palette.text}50`, fontSize: 13, fontWeight: 400,
          textAlign: 'center'
        }}>
          Spotify • Apple Music • YouTube Music • Amazon Music
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '40px', position: 'relative', zIndex: 1 }}>
        <span style={{ color: `${palette.text}30`, fontSize: 12, letterSpacing: '3px', textTransform: 'uppercase' }}>otonami.io</span>
      </div>
    </div>
  );
}
