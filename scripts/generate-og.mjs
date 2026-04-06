import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const WIDTH = 1200;
const HEIGHT = 630;

const svgOverlay = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgba(26,26,24,0.72)" />
  <text x="600" y="260" text-anchor="middle"
    font-family="sans-serif" font-size="72" font-weight="700"
    fill="#ffffff" letter-spacing="8">OTONAMI</text>
  <text x="600" y="330" text-anchor="middle"
    font-family="sans-serif" font-size="26" font-weight="400"
    fill="#c4956a">Connect Japanese Music to the World</text>
  <text x="1150" y="600" text-anchor="end"
    font-family="sans-serif" font-size="18" font-weight="400"
    fill="rgba(255,255,255,0.5)">otonami.io</text>
</svg>`;

async function main() {
  const base = await sharp(join(root, 'public/images/stage-performance.jpg'))
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .toBuffer();

  await sharp(base)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .jpeg({ quality: 85 })
    .toFile(join(root, 'public/images/og-image.jpg'));

  console.log('OG image generated: public/images/og-image.jpg');
}

main().catch(e => { console.error(e); process.exit(1); });
