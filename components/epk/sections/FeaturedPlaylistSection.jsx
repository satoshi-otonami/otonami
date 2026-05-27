// EPK Featured Playlist — a pinned "pickup" track (large) + a short list of
// other tracks. Replaces the single Featured Track from Phase 1. Hidden when
// the playlist is empty (the theme also guards on data presence).

function listenUrl(track) {
  return (
    track.spotify_url ||
    track.youtube_url ||
    track.soundcloud_url ||
    track.bandcamp_url ||
    null
  );
}

function PinnedCard({ track, lang }) {
  const year = track.release_date
    ? new Date(track.release_date).getFullYear()
    : null;
  const tag = year
    ? `Release · ${year}`
    : lang === 'en'
    ? 'Featured'
    : 'フィーチャー';
  const url = listenUrl(track);
  const cover = track.cover_image_url || null;
  const bars = Array.from({ length: 16 });

  return (
    <div className="pickup-card">
      <div className="pickup-meta">
        <span className="pickup-tag">{tag}</span>
        <h2 className="pickup-title">{track.title}</h2>
        {track.genre && <p className="pickup-subtitle">{track.genre}</p>}
        {url && (
          <a
            className="play-button"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="icon" />
            {lang === 'en' ? 'Listen now' : '試聴する'}
          </a>
        )}
      </div>
      <div className="pickup-visual">
        {cover ? (
          <img src={cover} alt={track.title} />
        ) : (
          <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="epk-pl-rg1" cx="0.5" cy="0.5" r="0.7">
                <stop offset="0%" stopColor="#d8553f" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0a1620" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="400" height="400" fill="url(#epk-pl-rg1)" />
            <g stroke="#f5ecd9" strokeWidth="0.8" fill="none" opacity="0.3">
              <circle cx="200" cy="200" r="60" />
              <circle cx="200" cy="200" r="100" />
              <circle cx="200" cy="200" r="140" />
            </g>
          </svg>
        )}
        <div className="waveform">
          {bars.map((_, i) => (
            <div
              key={i}
              className="bar"
              style={{ animationDelay: `${(i % 8) * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaylistRow({ track, num }) {
  const year = track.release_date
    ? new Date(track.release_date).getFullYear()
    : null;
  const url = listenUrl(track);
  const sub = [track.genre, year].filter(Boolean).join(' · ');

  return (
    <li className="playlist-row">
      <span className="playlist-num">{num}</span>
      {track.cover_image_url ? (
        <img
          className="playlist-art"
          src={track.cover_image_url}
          alt={track.title}
        />
      ) : (
        <div className="playlist-art playlist-art-ph" />
      )}
      <div className="playlist-info">
        <span className="playlist-title">{track.title}</span>
        {sub && <span className="playlist-sub">{sub}</span>}
      </div>
      {url && (
        <a
          className="playlist-play"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Play ${track.title}`}
        >
          ▶
        </a>
      )}
    </li>
  );
}

export default function FeaturedPlaylistSection({ playlistTracks, lang, num = '01' }) {
  if (!playlistTracks || playlistTracks.length === 0) return null;
  const [pinned, ...others] = playlistTracks;

  return (
    <section className="pickup">
      <div className="section-label" data-no={num}>
        Featured Playlist
      </div>
      <PinnedCard track={pinned} lang={lang} />
      {others.length > 0 && (
        <div className="playlist-list">
          <h3 className="playlist-list-title">
            {lang === 'en' ? 'More from this artist' : 'その他の楽曲'}
          </h3>
          <ul>
            {others.map((t, i) => (
              <PlaylistRow
                key={t.id}
                track={t}
                num={String(i + 2).padStart(2, '0')}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
