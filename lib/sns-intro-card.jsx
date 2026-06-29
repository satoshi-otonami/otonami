import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// ── ブランドカラー ──
const PAPER = '#FDF9F2';
const CHARCOAL = '#1a1a1a';
const CORAL = '#FF6B4A';
const GOLD = '#C9A24B';
const SUB_GRAY = '#6b6b6b';
const CAP_GRAY = '#9a8f80';
const DIVIDER = '#E3D9C4';
const CORAL_PILL_BG = '#FBE0D8';
const CORAL_PILL_TX = '#B23A1E';
const TEAL_PILL_BG = '#D7F2EE';
const TEAL_PILL_TX = '#1E7A70';

// ── タグ上限（後から調整可） ──
const MAX_GENRES = 3;
const MAX_MOODS = 2;

const TYPE_LABELS = {
  radio: 'Radio',
  playlist: 'Playlist',
  blog: 'Blog',
  label: 'Label',
  media: 'Media',
};

// フォントは module-level でキャッシュ（複数生成時の重複読込を避ける）
let _fontCache = null;
async function loadFonts() {
  if (_fontCache) return _fontCache;
  const base = join(process.cwd(), 'node_modules/@fontsource/noto-sans-jp/files');
  const files = [
    ['noto-sans-jp-latin-400-normal.woff', 400],
    ['noto-sans-jp-latin-500-normal.woff', 500],
    ['noto-sans-jp-japanese-400-normal.woff', 400],
    ['noto-sans-jp-japanese-500-normal.woff', 500],
  ];
  const fonts = [];
  for (const [file, weight] of files) {
    const data = await readFile(join(base, file));
    fonts.push({ name: 'Noto Sans JP', data, weight, style: 'normal' });
  }
  _fontCache = fonts;
  return fonts;
}

// icon_url を事前 fetch して dataURL 化（失敗・不在なら null → イニシャルへ）
async function loadAvatar(iconUrl) {
  if (!iconUrl || typeof iconUrl !== 'string' || !iconUrl.startsWith('http')) return null;
  try {
    const res = await fetch(iconUrl);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/png';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function Pill({ text, bg, color, first }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 26px',
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 37,
        fontWeight: 500,
        marginLeft: first ? 0 : 16,
      }}
    >
      {text}
    </div>
  );
}

function TagSection({ caption, items, bg, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 40,
      }}
    >
      <div style={{ display: 'flex', fontSize: 31, letterSpacing: 4, color: CAP_GRAY, marginBottom: 18 }}>
        {caption}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
        {items.map((t, i) => (
          <Pill key={i} text={t} bg={bg} color={color} first={i === 0} />
        ))}
      </div>
    </div>
  );
}

export async function renderCuratorCard(curator) {
  const fonts = await loadFonts();
  const avatar = await loadAvatar(curator?.icon_url);

  const genres = Array.isArray(curator?.genres) ? curator.genres.slice(0, MAX_GENRES) : [];
  const moods = Array.isArray(curator?.preferred_moods) ? curator.preferred_moods.slice(0, MAX_MOODS) : [];
  const typeLabel = TYPE_LABELS[curator?.type] || (curator?.type ? cap(curator.type) : '');
  const sub = [typeLabel, curator?.region].filter(Boolean).join('   ·   ');
  const name = curator?.name || '';
  const initial = (name.trim().charAt(0) || '?').toUpperCase();

  const img = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: PAPER,
          padding: '96px 84px',
          position: 'relative',
          fontFamily: '"Noto Sans JP"',
        }}
      >
        {/* ゴールドの内枠 */}
        <div
          style={{
            position: 'absolute',
            top: 45,
            left: 45,
            right: 45,
            bottom: 45,
            border: `2px solid ${GOLD}`,
            borderRadius: 45,
            display: 'flex',
          }}
        />

        {/* ヘッダー */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 500, letterSpacing: 8, color: CHARCOAL }}>OTONAMI</div>
          <div style={{ display: 'flex', fontSize: 34, color: CORAL }}>New curator</div>
        </div>

        {/* 中央ブロック */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {avatar ? (
            <img
              src={avatar}
              width={204}
              height={204}
              style={{ borderRadius: 102, border: `3px solid ${GOLD}`, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 204,
                height: 204,
                borderRadius: 102,
                background: TEAL_PILL_BG,
                border: `3px solid ${GOLD}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: TEAL_PILL_TX,
                fontSize: 96,
                fontWeight: 500,
              }}
            >
              {initial}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              fontSize: 74,
              fontWeight: 500,
              color: CHARCOAL,
              marginTop: 40,
              maxWidth: 860,
              textAlign: 'center',
              lineHeight: 1.15,
            }}
          >
            {name}
          </div>

          {sub ? (
            <div style={{ display: 'flex', fontSize: 37, color: SUB_GRAY, marginTop: 14 }}>{sub}</div>
          ) : null}

          <div style={{ display: 'flex', width: 90, height: 2, background: DIVIDER, marginTop: 30 }} />

          <TagSection caption="Genres" items={genres} bg={CORAL_PILL_BG} color={CORAL_PILL_TX} />
          <TagSection caption="Moods" items={moods} bg={TEAL_PILL_BG} color={TEAL_PILL_TX} />
        </div>

        {/* フッター */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 90, height: 2, background: GOLD, marginBottom: 22 }} />
          <div style={{ display: 'flex', fontSize: 42, fontWeight: 500, color: CORAL }}>otonami.io</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080, fonts }
  );

  return Buffer.from(await img.arrayBuffer());
}
