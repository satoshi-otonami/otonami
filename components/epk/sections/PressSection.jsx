// EPK Press & Recognition — pull-quote cards. Source: epk_press rows (ordered
// by sort_order). Hidden when empty.
export default function PressSection({ press, lang, num = '06' }) {
  const rows = Array.isArray(press) ? press : [];
  if (rows.length === 0) return null;

  return (
    <section className="press">
      <div className="section-label" data-no={num}>
        Press &amp; Recognition
      </div>
      <h2 className="section-h2">
        On the <em>record.</em>
      </h2>
      <div className="press-grid">
        {rows.map((p) => {
          const quote =
            lang === 'en' ? p.quote_en || p.quote_jp : p.quote_jp || p.quote_en;
          return (
            <blockquote className="press-card" key={p.id}>
              {quote && <p className="press-quote">{quote}</p>}
              <footer className="press-meta">
                {p.source_url ? (
                  <a
                    className="press-source"
                    href={p.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.source}
                  </a>
                ) : (
                  <span className="press-source">{p.source}</span>
                )}
                {p.date_label && <span className="press-date">{p.date_label}</span>}
              </footer>
            </blockquote>
          );
        })}
      </div>
    </section>
  );
}
