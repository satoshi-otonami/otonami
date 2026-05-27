// EPK OTONAMI Badge — credibility stats from real pitch data.
// Stat row is hidden when the artist has no sent pitches yet.
export default function OtonamiBadgeSection({ stats, lang = 'en' }) {
  const s = stats || {};
  const t = (en, jp) => (lang === 'en' ? en : jp);
  // Social-proof threshold: only surface numbers once they read as credible.
  // Below this, show the OTONAMI banner without stats (a lone curator is weak
  // proof). Tune this single constant as the platform grows.
  const MIN_CURATORS_FOR_STATS = 5;
  const showStats = (s.curators_reached || 0) >= MIN_CURATORS_FOR_STATS;

  return (
    <section className="otonami-badge">
      <div className="otonami-badge-inner">
        <div className="otonami-eyebrow">
          {t('Pitched via OTONAMI', 'OTONAMI 経由でピッチ配信')}
        </div>
        <h2 className="section-h2" style={{ textAlign: 'center' }}>
          {lang === 'en' ? (
            <>
              Curated to <em>reach</em> the right ears.
            </>
          ) : (
            <>
              届くべき耳へ、<em>キュレーション</em>を。
            </>
          )}
        </h2>
        {showStats && (
          <div className="otonami-stat-row">
            <div>
              <div className="otonami-stat-num">
                <em>{s.curators_reached}</em>
              </div>
              <div className="otonami-stat-label">
                {t('Curators Reached', 'リーチしたキュレーター')}
              </div>
            </div>
            <div>
              <div className="otonami-stat-num">
                <em>{s.countries}</em>
              </div>
              <div className="otonami-stat-label">{t('Countries', '国数')}</div>
            </div>
            <div>
              <div className="otonami-stat-num">
                <em>{s.response_rate}%</em>
              </div>
              <div className="otonami-stat-label">
                {t('Response Rate', '返信率')}
              </div>
            </div>
          </div>
        )}
        <p className="otonami-caption">
          {t(
            "Delivered to international curators through OTONAMI's matching engine.",
            'OTONAMI のマッチングエンジンを通じて、世界中のキュレーターへ届けています。'
          )}
        </p>
      </div>
    </section>
  );
}
