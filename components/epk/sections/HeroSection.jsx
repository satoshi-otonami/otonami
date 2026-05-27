// EPK Hero — artist name, tagline, meta, and the portrait/vinyl composition.
export default function HeroSection({ artist, epk, tracks, lang }) {
  const name = artist?.name || 'Artist';
  const genres = (artist?.genres || []).filter(Boolean);
  const tagline =
    lang === 'en'
      ? epk?.tagline_en || epk?.tagline_jp
      : epk?.tagline_jp || epk?.tagline_en;
  const taglineText = tagline || (artist?.bio ? artist.bio.slice(0, 160) : '');
  const kickerParts = [artist?.region, artist?.label_name].filter(Boolean);
  const portraitImg = artist?.cover_url || artist?.avatar_url || null;
  const count = tracks?.length || 0;
  const unit = lang === 'en' ? ' tracks' : '曲';
  const catalog = count ? `${count}${count >= 10 ? '+' : ''}${unit}` : '—';

  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-left">
        {kickerParts.length > 0 && (
          <div className="kicker">{kickerParts.join(' · ')}</div>
        )}
        <h1>{name}</h1>
        {taglineText && <p className="hero-tagline">{taglineText}</p>}
        <div className="hero-meta">
          <div>
            {lang === 'en' ? 'Genre' : 'ジャンル'}
            <span>{genres.length ? genres.join(' · ') : '—'}</span>
          </div>
          <div>
            {lang === 'en' ? 'Origin' : '拠点'}
            <span>{artist?.region || 'JP'}</span>
          </div>
          <div>
            {lang === 'en' ? 'Catalog' : 'カタログ'}
            <span>{catalog}</span>
          </div>
        </div>
      </div>
      <div className="hero-right">
        <div className="hero-visual">
          <div className="portrait-frame">
            {portraitImg ? (
              <>
                <div
                  className="hero-photo-bg"
                  style={{ backgroundImage: `url("${portraitImg}")` }}
                />
                <img src={portraitImg} alt={name} />
              </>
            ) : (
              <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="epk-g1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#c4956a" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0a1620" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <rect width="400" height="500" fill="url(#epk-g1)" />
                <g opacity="0.4" stroke="#f5ecd9" strokeWidth="0.5" fill="none">
                  <circle cx="200" cy="180" r="60" />
                  <path d="M140 240 Q200 280 260 240 L260 380 Q200 400 140 380 Z" />
                  <line x1="170" y1="260" x2="170" y2="350" />
                  <line x1="230" y1="260" x2="230" y2="350" />
                </g>
              </svg>
            )}
          </div>
          <div className="vinyl" />
        </div>
      </div>
      <div className="scroll-cue">{lang === 'en' ? 'Scroll' : 'スクロール'}</div>
    </section>
  );
}
