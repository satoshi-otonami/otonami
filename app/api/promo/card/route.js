// app/api/promo/card/route.js
// Placid.app REST API 経由でプロモカード画像を生成

import { selectPalette, getPaletteByName } from '@/lib/promo-palette';

// テンプレートUUID マッピング（Placidで作成後に実際のUUIDを入れる）
const TEMPLATE_MAP = {
  'player-feed':  process.env.PLACID_TPL_PLAYER_FEED  || 'PLACEHOLDER',
  'player-story': process.env.PLACID_TPL_PLAYER_STORY || 'PLACEHOLDER',
  'vinyl-feed':   process.env.PLACID_TPL_VINYL_FEED   || 'PLACEHOLDER',
  'vinyl-story':  process.env.PLACID_TPL_VINYL_STORY  || 'PLACEHOLDER',
  'live-feed':    process.env.PLACID_TPL_LIVE_FEED    || 'PLACEHOLDER',
  'live-story':   process.env.PLACID_TPL_LIVE_STORY   || 'PLACEHOLDER',
};

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
    } = body;

    // パレット選択（手動指定 or audioFeaturesから自動）
    const palette = paletteOverride
      ? getPaletteByName(paletteOverride)
      : selectPalette(audioFeatures || {});

    const templateKey = `${template}-${format}`;
    const templateUuid = TEMPLATE_MAP[templateKey];

    if (!templateUuid || templateUuid === 'PLACEHOLDER') {
      return Response.json(
        { error: `Template "${templateKey}" not configured. Set PLACID_TPL_${template.toUpperCase()}_${format.toUpperCase()} in environment variables.` },
        { status: 400 }
      );
    }

    // リリース日フォーマット
    const formattedDate = releaseDate
      ? new Date(releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    // ジャンルタグ（最大3つ、ドット区切り）
    const genreText = genres.slice(0, 3).join(' • ');

    // バッジテキスト
    const badgeMap = { player: 'Now Playing', vinyl: 'New Release', live: 'Streaming Now' };
    const badgeText = badgeMap[template] || 'New Release';

    // Placid API リクエスト
    const placidResponse = await fetch('https://api.placid.app/api/rest/images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PLACID_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_uuid: templateUuid,
        create_now: true,
        layers: {
          // 動的コンテンツレイヤー
          bg_image: imageUrl ? { image: imageUrl } : undefined,
          artwork: imageUrl ? { image: imageUrl } : undefined,
          track_title: { text: trackTitle },
          artist_name: { text: artistName },
          release_date: { text: formattedDate },
          genre_tags: { text: genreText },
          badge_text: { text: badgeText, color: palette.accent },
          brand_logo: { text: 'OTONAMI' },
          // パレット連動カラーレイヤー
          bg_gradient: { color: palette.accent },
          bg_glow: { color: palette.accent },
          progress_fill: { color: palette.accent },
        },
      }),
    });

    if (!placidResponse.ok) {
      const errorData = await placidResponse.json().catch(() => ({}));
      console.error('Placid API error:', placidResponse.status, errorData);
      return Response.json(
        { error: 'Failed to generate image', details: errorData },
        { status: 500 }
      );
    }

    const data = await placidResponse.json();

    // data.image_url に生成された画像のURLが入る
    return Response.json({
      success: true,
      imageUrl: data.image_url,
      templateUsed: templateKey,
      placidId: data.id,
    });

  } catch (error) {
    console.error('Promo card generation error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
