// EPK OTONAMI Badge — credibility stats from real pitch data.
// Stat row is hidden when the artist has no sent pitches yet.
export default function OtonamiBadgeSection({ stats }) {
  const s = stats || {};
  // Social-proof threshold: only surface numbers once they read as credible.
  // Below this, show the OTONAMI banner without stats (a lone curator is weak
  // proof). Tune this single constant as the platform grows.
  const MIN_CURATORS_FOR_STATS = 5;
  const showStats = (s.curators_reached || 0) >= MIN_CURATORS_FOR_STATS;

  return (
    <section className="otonami-badge">
      <div className="otonami-badge-inner">
        <div className="otonami-eyebrow">Pitched via OTONAMI</div>
        <h2 className="section-h2" style={{ textAlign: 'center' }}>
          Curated to <em>reach</em> the right ears.
        </h2>
        {showStats && (
          <div className="otonami-stat-row">
            <div>
              <div className="otonami-stat-num">
                <em>{s.curators_reached}</em>
              </div>
              <div className="otonami-stat-label">Curators Reached</div>
            </div>
            <div>
              <div className="otonami-stat-num">
                <em>{s.countries}</em>
              </div>
              <div className="otonami-stat-label">Countries</div>
            </div>
            <div>
              <div className="otonami-stat-num">
                <em>{s.response_rate}%</em>
              </div>
              <div className="otonami-stat-label">Response Rate</div>
            </div>
          </div>
        )}
        <p className="otonami-caption">
          Delivered to international curators through OTONAMI&apos;s matching
          engine.
        </p>
      </div>
    </section>
  );
}
