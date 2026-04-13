// Lyric Video Generator — templates, animations, and Canvas rendering helpers

export const TEMPLATES = {
  'neon-city': {
    name: 'Neon City',
    nameJa: 'ネオンシティ',
    description: 'Cyberpunk city vibes with neon glow text',
    textColor: '#ffffff',
    textShadow: true,
    shadowColor: 'rgba(196, 149, 106, 0.85)',
    shadowBlur: 24,
    fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    fontWeight: '900',
    fontSize: 60,
    textPosition: 'center',
    bgColor: '#0a0a0a',
    overlay: 'rgba(0,0,0,0.35)',
  },
  'minimal-dark': {
    name: 'Minimal Dark',
    nameJa: 'ミニマルダーク',
    description: 'Clean dark background with elegant typography',
    textColor: '#f0ede6',
    textShadow: false,
    shadowColor: 'transparent',
    shadowBlur: 0,
    fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", serif',
    fontWeight: '500',
    fontSize: 52,
    textPosition: 'center',
    bgColor: '#1a1a1a',
    overlay: null,
  },
  'warm-analog': {
    name: 'Warm Analog',
    nameJa: 'ウォームアナログ',
    description: 'Warm vintage film aesthetic',
    textColor: '#f5e6d3',
    textShadow: true,
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowBlur: 12,
    fontFamily: '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif',
    fontWeight: '700',
    fontSize: 54,
    textPosition: 'bottom',
    bgColor: '#2a1810',
    overlay: 'rgba(139, 90, 43, 0.28)',
  },
  'pop-vivid': {
    name: 'Pop Vivid',
    nameJa: 'ポップビビッド',
    description: 'Bold gradient background with pop typography',
    textColor: '#ffffff',
    textShadow: true,
    shadowColor: 'rgba(255, 61, 110, 0.8)',
    shadowBlur: 18,
    fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    fontWeight: '900',
    fontSize: 58,
    textPosition: 'center',
    bgColor: '#FF6B4A',
    gradient: ['#FF6B4A', '#FF3D6E', '#A78BFA'],
    overlay: 'rgba(0,0,0,0.15)',
  },
};

export const ANIMATIONS = {
  'fade-in': { name: 'Fade In', nameJa: 'フェードイン' },
  'slide-up': { name: 'Slide Up', nameJa: 'スライドアップ' },
  'typewriter': { name: 'Typewriter', nameJa: 'タイプライター' },
};

// Canvas描画: 1フレーム分のレンダリング
export function renderFrame(ctx, options) {
  const {
    width,
    height,
    backgroundImage,
    template,
    currentTime,
    segments,
    animation,
  } = options;

  // 背景描画
  if (backgroundImage) {
    const imgRatio = backgroundImage.width / backgroundImage.height;
    const canvasRatio = width / height;
    let drawW, drawH, drawX, drawY;

    if (imgRatio > canvasRatio) {
      drawH = height;
      drawW = height * imgRatio;
      drawX = (width - drawW) / 2;
      drawY = 0;
    } else {
      drawW = width;
      drawH = width / imgRatio;
      drawX = 0;
      drawY = (height - drawH) / 2;
    }
    ctx.drawImage(backgroundImage, drawX, drawY, drawW, drawH);
  } else if (template.gradient) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    template.gradient.forEach((color, i) => {
      gradient.addColorStop(i / (template.gradient.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = template.bgColor || '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
  }

  if (template.overlay) {
    ctx.fillStyle = template.overlay;
    ctx.fillRect(0, 0, width, height);
  }

  const activeSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );
  if (!activeSegment) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = template.fontSize * (width / 1920);
  ctx.font = `${template.fontWeight} ${fontSize}px ${template.fontFamily}`;
  ctx.fillStyle = template.textColor;

  if (template.textShadow) {
    ctx.shadowColor = template.shadowColor;
    ctx.shadowBlur = template.shadowBlur * (width / 1920);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  let textY;
  switch (template.textPosition) {
    case 'top': textY = height * 0.25; break;
    case 'bottom': textY = height * 0.78; break;
    default: textY = height * 0.5;
  }

  const segDuration = Math.max(0.001, activeSegment.end - activeSegment.start);
  const segProgress = (currentTime - activeSegment.start) / segDuration;
  let alpha = 1;
  let offsetY = 0;
  let displayText = activeSegment.text;

  switch (animation) {
    case 'fade-in': {
      alpha = Math.min(1, segProgress * 4);
      break;
    }
    case 'slide-up': {
      const slideProgress = Math.min(1, segProgress * 3);
      offsetY = (1 - slideProgress) * 40;
      alpha = slideProgress;
      break;
    }
    case 'typewriter': {
      const charCount = Math.max(
        1,
        Math.floor([...activeSegment.text].length * Math.min(1, segProgress * 2))
      );
      displayText = [...activeSegment.text].slice(0, charCount).join('');
      break;
    }
    default:
      break;
  }

  ctx.globalAlpha = alpha;
  wrapText(ctx, displayText, width / 2, textY + offsetY, width * 0.82, fontSize * 1.4);
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

// 日本語対応の折り返し描画（文字単位）
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  const lines = [];
  let currentLine = '';

  for (const char of chars) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

export function getCanvasDimensions(aspectRatio) {
  switch (aspectRatio) {
    case '9:16': return { width: 1080, height: 1920 };
    case '1:1': return { width: 1080, height: 1080 };
    default: return { width: 1920, height: 1080 };
  }
}
