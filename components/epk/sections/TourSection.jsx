// EPK Tour & Live — highlight cards (is_highlight) + a chronological timeline.
// Source: epk_tour rows (already ordered by sort_order). Hidden when empty.
export default function TourSection({ tour, lang, num = '05' }) {
  const rows = Array.isArray(tour) ? tour : [];
  if (rows.length === 0) return null;

  const highlights = rows.filter((t) => t.is_highlight);
  const timeline = rows.filter((t) => !t.is_highlight);

  return (
    <section className="tour">
      <div className="section-label" data-no={num}>
        Tour &amp; Live
      </div>
      <h2 className="section-h2">
        On <em>stage.</em>
      </h2>

      {highlights.length > 0 && (
        <div className="tour-highlights">
          {highlights.map((h) => {
            const label =
              h.highlight_label ||
              (lang === 'en' ? h.event_en : h.event_jp || h.event_en);
            return (
              <div className="highlight-card" key={h.id}>
                {h.highlight_count != null && (
                  <div className="highlight-num">
                    {h.highlight_count}
                    <span>×</span>
                  </div>
                )}
                {label && <div className="highlight-label">{label}</div>}
                {h.location && <div className="highlight-loc">{h.location}</div>}
              </div>
            );
          })}
        </div>
      )}

      {timeline.length > 0 && (
        <ul className="tour-timeline">
          {timeline.map((t) => {
            const event =
              lang === 'en' ? t.event_en || t.event_jp : t.event_jp || t.event_en;
            return (
              <li className="tour-row" key={t.id}>
                {t.year && <span className="tour-year">{t.year}</span>}
                <span className="tour-event">{event}</span>
                {t.location && <span className="tour-loc">{t.location}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
