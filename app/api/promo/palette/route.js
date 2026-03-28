// app/api/promo/palette/route.js
import { selectPalette, PALETTES } from '@/lib/promo-palette';

export async function POST(request) {
  const body = await request.json();
  const { audioFeatures } = body;

  const selected = selectPalette(audioFeatures || {});

  return Response.json({
    selected,
    all: Object.values(PALETTES)
  });
}
