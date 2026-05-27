// EPK Biography — pull quote (sidebar) + bio body, language-aware.
export default function BioSection({ artist, epk, lang }) {
  const quote =
    lang === 'en'
      ? epk?.pull_quote_en || epk?.pull_quote_jp
      : epk?.pull_quote_jp || epk?.pull_quote_en;

  const bioRaw =
    lang === 'en'
      ? epk?.bio_extended_en || artist?.bio || epk?.bio_extended_jp
      : epk?.bio_extended_jp || artist?.bio || epk?.bio_extended_en;

  const paragraphs = (bioRaw || '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <section className="bio" id="bio">
      <div className="section-label" data-no="02">
        Biography
      </div>
      <div className="bio-grid">
        <div className="bio-sidebar">
          {quote && <p className="pull-quote">{quote}</p>}
          {quote && artist?.name && (
            <p className="pull-quote-translation">— {artist.name}</p>
          )}
        </div>
        <div className="bio-content">
          <div className={`bio-body ${lang === 'jp' ? 'bio-jp' : 'bio-en'}`}>
            {paragraphs.length ? (
              paragraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>{artist?.name} — biography coming soon.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
