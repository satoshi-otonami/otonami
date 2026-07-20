'use client';

/* ── DB type → display label (same mapping as /curators, app/curators/page.js) ── */
const TYPE_LABEL = {
  playlist: 'Playlist Curator',
  blog: 'Media Outlet/Journalist',
  media: 'Media Outlet/Journalist',
  radio: 'Radio/Podcast',
  label: 'Label/Management',
  booking_agent: 'Booking Agent',
  sync: 'Sync / Licensing',
  management: 'Artist Management',
  other: 'Curator',
};

/* Brand-color rotation for initial-circle avatars (no icon_url) */
const AVATAR_COLORS = ['#FF6B4A', '#4ECDC4', '#A78BFA', '#FF3D6E'];

/* Light-section palette (section background is white, matching the old trust bar) */
const P = {
  pillBg: '#FDF9F2',
  pillBorder: '#f0e9de',
  name: '#1a1a1a',
  meta: '#8a8276',
};

const FONT = "'DM Sans', sans-serif";

function Avatar({ curator, index }) {
  if (curator.iconUrl) {
    return (
      <img
        src={curator.iconUrl}
        alt=""
        width={28}
        height={28}
        loading="lazy"
        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
      />
    );
  }
  const initial = (curator.playlist || curator.name || '?').trim().charAt(0).toUpperCase();
  return (
    <span style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: FONT,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {initial}
    </span>
  );
}

function Pill({ curator, index }) {
  const typeLabel = TYPE_LABEL[curator.type] || curator.type || 'Curator';
  const meta = curator.region ? `${curator.region} ・ ${typeLabel}` : typeLabel;
  const displayName = curator.playlist || curator.name;
  return (
    <a href="/curators" style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      border: `1px solid ${P.pillBorder}`, borderRadius: 999,
      padding: '7px 16px 7px 8px', background: P.pillBg,
      whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none',
    }}>
      <Avatar curator={curator} index={index} />
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.3 }}>
        <span style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: P.name }}>{displayName}</span>
        <span style={{ fontFamily: FONT, fontSize: 11, color: P.meta }}>{meta}</span>
      </span>
    </a>
  );
}

function MarqueeRow({ curators, reverse, duration, offset }) {
  // Content duplicated twice; the 0→-50% (or -50%→0) loop lands exactly on the seam.
  const doubled = [...curators, ...curators];
  return (
    <div className="lp-cm-row">
      <div
        className={`lp-cm-track ${reverse ? 'lp-cm-track--reverse' : ''}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((c, i) => (
          <Pill key={i} curator={c} index={(i % curators.length) + offset} />
        ))}
      </div>
    </div>
  );
}

export default function CuratorMarquee({ data, lang }) {
  const hasData = !!(data && data.count > 0 && data.curators?.length > 0);

  // Top row = first half (extra pill goes to the top row when odd)
  const topHalf = hasData ? data.curators.slice(0, Math.ceil(data.curators.length / 2)) : [];
  const bottomHalf = hasData ? data.curators.slice(Math.ceil(data.curators.length / 2)) : [];

  return (
    <section style={{ background: '#ffffff', padding: '48px 0 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: '#999', textTransform: 'uppercase',
          letterSpacing: '2px', marginBottom: 20, fontFamily: FONT,
        }}>
          {lang === 'en' ? 'Trusted by' : '信頼と実績'}
        </p>

        {hasData && (
          <>
            {/* Dynamic stat line — numbers come from the DB, never hardcoded */}
            <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24, fontFamily: FONT }}>
              <strong style={{ color: '#c4956a', fontWeight: 700 }}>{data.count}</strong> curators
              &nbsp;・&nbsp;
              listening worldwide
              &nbsp;—&nbsp;
              {lang === 'en' ? 'Recently joined curators' : '最近参加したキュレーター'}
            </p>

            <div className="lp-cm-mask" style={{ marginBottom: 20 }}>
              <MarqueeRow curators={topHalf} reverse={false} duration={38} offset={0} />
              <MarqueeRow curators={bottomHalf} reverse duration={44} offset={topHalf.length} />
            </div>
          </>
        )}

        {/* FEATURED IN — real third-party press coverage (media feature cards) */}
        <div style={{ marginBottom: 28 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#a89f92', fontFamily: FONT, marginBottom: 14,
          }}>
            {lang === 'en' ? 'Featured in' : 'メディア掲載'}
          </p>
          <div className="lp-media-cards">
            {/* Card 1 — YV Art Magazine (linked interview) */}
            <a
              href="https://www.vinniejinn.com/post/satoshiyamashita-otonami"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-media-card lp-media-card--link"
            >
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#c4956a', fontFamily: FONT,
              }}>
                {lang === 'en' ? 'Interview' : 'インタビュー'}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: FONT }}>
                YV Art Magazine
              </span>
              <span style={{ fontSize: 12, color: '#8a8276', fontFamily: FONT }}>
                {lang === 'en' ? 'July 2026' : '2026年7月'}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#c4956a', fontFamily: FONT, marginTop: 2 }}>
                {lang === 'en' ? 'Read article ↗' : '記事を読む ↗'}
              </span>
            </a>

            {/* Card 2 — E-TALENTBANK / Yahoo! News (news mention, no live link) */}
            <div className="lp-media-card lp-media-card--news">
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#a89f92', fontFamily: FONT,
              }}>
                {lang === 'en' ? 'News' : 'ニュース'}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#6b6459', fontFamily: FONT }}>
                {lang === 'en' ? 'E-TALENTBANK / Yahoo! News JAPAN' : 'E-TALENTBANK / Yahoo!ニュース'}
              </span>
              <span style={{ fontSize: 12, color: '#a89f92', fontFamily: FONT }}>
                {lang === 'en' ? 'May 2026' : '2026年5月 配信'}
              </span>
            </div>
          </div>
        </div>

        {/* Browse all curators */}
        <p style={{ fontSize: 13, marginBottom: 28, fontFamily: FONT }}>
          <a href="/curators" style={{ color: '#c4956a', textDecoration: 'none', fontWeight: 600 }}>
            {lang === 'en' ? 'Browse all curators →' : 'キュレーター一覧を見る →'}
          </a>
        </p>
      </div>

      <style>{`
        .lp-media-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          max-width: 560px;
          margin: 0 auto;
          text-align: left;
        }
        @media (min-width: 640px) {
          .lp-media-cards { grid-template-columns: 1fr 1fr; }
        }
        .lp-media-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #FDF9F2;
        }
        .lp-media-card--link {
          border: 1px solid #e7d3bd;
          text-decoration: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .lp-media-card--link:hover {
          border-color: #c4956a;
          box-shadow: 0 2px 10px rgba(196, 149, 106, 0.14);
        }
        .lp-media-card--news {
          border: 1px solid #f0e9de;
          background: #fcfaf6;
        }
        .lp-cm-mask {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, white 8%, white 92%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, white 8%, white 92%, transparent 100%);
        }
        .lp-cm-row { overflow: hidden; padding: 6px 0; }
        .lp-cm-track {
          display: flex;
          gap: 12px;
          width: max-content;
          animation-name: lp-cm-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .lp-cm-track--reverse { animation-name: lp-cm-scroll-reverse; }
        .lp-cm-row:hover .lp-cm-track { animation-play-state: paused; }
        @keyframes lp-cm-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes lp-cm-scroll-reverse {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-cm-track { animation: none !important; }
          .lp-cm-row { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .lp-cm-mask { -webkit-mask-image: none; mask-image: none; }
        }
      `}</style>
    </section>
  );
}
