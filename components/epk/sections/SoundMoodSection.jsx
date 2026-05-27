// EPK Sound & Mood — listening-context scenes. Source: epk.sound_scenes
// (JSONB array of { title_en, title_jp, desc_en, desc_jp }). Hidden when empty.
export default function SoundMoodSection({ scenes, lang, num = '03' }) {
  const list = (Array.isArray(scenes) ? scenes : []).filter(
    (s) => s && (s.title_en || s.title_jp || s.desc_en || s.desc_jp)
  );
  if (list.length === 0) return null;

  return (
    <section className="sound-mood">
      <div className="section-label" data-no={num}>
        Sound &amp; Mood
      </div>
      <h2 className="section-h2">
        Where it <em>plays.</em>
      </h2>
      <div className="scene-grid">
        {list.map((s, i) => {
          const title =
            lang === 'en'
              ? s.title_en || s.title_jp
              : s.title_jp || s.title_en;
          const desc =
            lang === 'en' ? s.desc_en || s.desc_jp : s.desc_jp || s.desc_en;
          return (
            <div className="scene-card" key={i}>
              <div className="scene-num">{String(i + 1).padStart(2, '0')}</div>
              {title && <h3 className="scene-title">{title}</h3>}
              {desc && <p className="scene-desc">{desc}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
