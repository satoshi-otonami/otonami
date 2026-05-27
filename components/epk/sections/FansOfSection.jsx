// EPK For Fans Of — reference artists. Source: epk.for_fans_of (JSONB array of
// { name, tag }); falls back to artist.influences (string[]). Hidden when both
// are empty.
export default function FansOfSection({ fans, influences, lang, num = '04' }) {
  let list = [];
  if (Array.isArray(fans) && fans.length > 0) {
    list = fans
      .filter((f) => f && f.name)
      .map((f) => ({ name: f.name, tag: f.tag || '' }));
  } else if (Array.isArray(influences) && influences.length > 0) {
    list = influences.filter(Boolean).map((n) => ({ name: n, tag: '' }));
  }
  if (list.length === 0) return null;

  return (
    <section className="fans-of">
      <div className="section-label" data-no={num}>
        For Fans Of
      </div>
      <h2 className="section-h2">
        {lang === 'en' ? (
          <>
            If you <em>love…</em>
          </>
        ) : (
          <>
            こんな音楽が<em>好きなら…</em>
          </>
        )}
      </h2>
      <div className="fans-grid">
        {list.map((f, i) => (
          <div className="fan-card" key={i}>
            <div className="fan-name">{f.name}</div>
            {f.tag && <div className="fan-tag">{f.tag}</div>}
          </div>
        ))}
      </div>
      <p className="fans-note">
        {lang === 'en'
          ? 'Reference points — not affiliations.'
          : '参考までに — 共演関係はありません'}
      </p>
    </section>
  );
}
