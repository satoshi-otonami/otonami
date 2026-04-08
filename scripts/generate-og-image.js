const { createCanvas } = require('canvas');
const fs = require('fs');

const WIDTH = 1200;
const HEIGHT = 630;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// 背景: ダークグラデーション
const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
gradient.addColorStop(0, '#1a1a2e');
gradient.addColorStop(0.5, '#16213e');
gradient.addColorStop(1, '#0f3460');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// アクセントグロー（coral）
ctx.beginPath();
ctx.arc(900, 315, 250, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(255, 107, 74, 0.12)';
ctx.fill();

// アクセントグロー（purple）
ctx.beginPath();
ctx.arc(300, 315, 200, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(167, 139, 250, 0.08)';
ctx.fill();

// タイトル: OTONAMI
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 72px Arial, sans-serif';
ctx.textAlign = 'center';
ctx.fillText('OTONAMI', WIDTH / 2, 260);

// 音波アイコン（テキストで代替）
ctx.fillStyle = '#c4956a';
ctx.font = '28px Arial, sans-serif';
ctx.fillText('〜 音波 〜', WIDTH / 2, 310);

// サブタイトル
ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
ctx.font = '24px Arial, sans-serif';
ctx.fillText('Connect Japanese Music to the World', WIDTH / 2, 380);

// 下部テキスト
ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
ctx.font = '16px Arial, sans-serif';
ctx.fillText('AI-Powered Pitch Platform for Japanese Independent Artists', WIDTH / 2, 440);

// ブランドカラーのアンダーライン
const lineGradient = ctx.createLinearGradient(400, 0, 800, 0);
lineGradient.addColorStop(0, '#FF6B4A');
lineGradient.addColorStop(0.5, '#c4956a');
lineGradient.addColorStop(1, '#A78BFA');
ctx.strokeStyle = lineGradient;
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(400, 470);
ctx.lineTo(800, 470);
ctx.stroke();

// URL
ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
ctx.font = '14px Arial, sans-serif';
ctx.fillText('otonami.io', WIDTH / 2, 560);

// 出力
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/og-image.png', buffer);
console.log('OG image generated: public/og-image.png (1200x630)');
