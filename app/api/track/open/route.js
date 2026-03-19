export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request) {
  // ピクセルを返すだけ。DB更新はしない。
  // Gmailなどのメールクライアントが受信時に画像をプリフェッチするため、
  // メール開封トラッキングピクセルでopened_atを更新すると、キュレーターが
  // 実際に開封する前にステータスが自動進行してしまう。
  // 開封記録はキュレーターがダッシュボードでピッチ詳細を開いた時に行う。
  return new NextResponse(PIXEL, { headers: PIXEL_HEADERS });
}
