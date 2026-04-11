const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Background: brand dark
ctx.fillStyle = '#0d0d1a';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Subtle radial glow
const glow = ctx.createRadialGradient(600, 290, 50, 600, 290, 400);
glow.addColorStop(0, 'rgba(255, 107, 74, 0.07)');
glow.addColorStop(1, 'rgba(13, 13, 26, 0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// --- Logo: circle ring with waveform bars ---
const logoX = 420;
const logoY = 285;
const ringRadius = 36;

// Outer ring
ctx.beginPath();
ctx.arc(logoX, logoY, ringRadius, 0, Math.PI * 2);
ctx.strokeStyle = '#FF6B4A';
ctx.lineWidth = 10;
ctx.stroke();

// Waveform bars clipped inside circle
ctx.save();
ctx.beginPath();
ctx.arc(logoX, logoY, 28, 0, Math.PI * 2);
ctx.clip();

const bars = [
  { x: -22, h: 10 },
  { x: -15, h: 24 },
  { x: -8, h: 36 },
  { x: -1, h: 44 },
  { x: 6, h: 36 },
  { x: 13, h: 24 },
  { x: 20, h: 10 },
];

ctx.fillStyle = '#FF6B4A';
for (const { x, h } of bars) {
  const bx = logoX + x;
  const by = logoY - h / 2;
  const bw = 4;
  const br = 2;
  ctx.beginPath();
  ctx.moveTo(bx + br, by);
  ctx.lineTo(bx + bw - br, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
  ctx.lineTo(bx + bw, by + h - br);
  ctx.quadraticCurveTo(bx + bw, by + h, bx + bw - br, by + h);
  ctx.lineTo(bx + br, by + h);
  ctx.quadraticCurveTo(bx, by + h, bx, by + h - br);
  ctx.lineTo(bx, by + br);
  ctx.quadraticCurveTo(bx, by, bx + br, by);
  ctx.fill();
}

ctx.restore();

// --- "OTONAMI" text ---
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 52px "Sora", "Helvetica Neue", Arial, sans-serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillText('OTONAMI', 472, 285);

// --- Tagline ---
ctx.fillStyle = '#FF6B4A';
ctx.font = '400 22px "DM Sans", "Helvetica Neue", Arial, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'top';
ctx.fillText('Connect Japanese Music to the World', 600, 340);

// --- Subtle bottom URL ---
ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
ctx.font = '400 15px "DM Sans", "Helvetica Neue", Arial, sans-serif';
ctx.textAlign = 'center';
ctx.fillText('otonami.io', 600, 570);

// Write PNG
const outputPath = path.join(__dirname, '..', 'public', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);
console.log(`OG image generated: ${outputPath} (${buffer.length} bytes)`);
