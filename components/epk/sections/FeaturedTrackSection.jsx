// EPK Featured Track — the pinned "pickup" card. Hidden entirely when no track.
export default function FeaturedTrackSection({ track }) {
  if (!track) return null;

  const year = track.release_date
    ? new Date(track.release_date).getFullYear()
    : null;
  const tag = year ? `Release · ${year}` : 'Featured Track';
  const listenUrl =
    track.spotify_url ||
    track.youtube_url ||
    track.soundcloud_url ||
    track.bandcamp_url ||
    null;
  const cover = track.cover_image_url || null;
  const bars = Array.from({ length: 16 });

  return (
    <section className="pickup">
      <div className="section-label" data-no="01">
        Featured Track
      </div>
      <div className="pickup-card">
        <div className="pickup-meta">
          <span className="pickup-tag">{tag}</span>
          <h2 className="pickup-title">{track.title}</h2>
          {track.genre && <p className="pickup-subtitle">{track.genre}</p>}
          {listenUrl && (
            <a
              className="play-button"
              href={listenUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="icon" />
              Listen now
            </a>
          )}
        </div>
        <div className="pickup-visual">
          {cover ? (
            <img src={cover} alt={track.title} />
          ) : (
            <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
              <defs>
                <radialGradient id="epk-rg1" cx="0.5" cy="0.5" r="0.7">
                  <stop offset="0%" stopColor="#d8553f" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0a1620" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="400" height="400" fill="url(#epk-rg1)" />
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
    </section>
  );
}
