// Sunset CITYPOP section components (v2 theme). Same data/lang/hide rules as
// Phase 2A, but citypop markup matching route14band-epk-v2-citypop.html.
// `num` is a roman numeral string (i, ii, …) assigned by the theme shell.

const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

import { externalHref } from '@/lib/url';

function listenUrl(t) {
  return t.spotify_url || t.youtube_url || t.soundcloud_url || t.bandcamp_url || null;
}
function yearOf(t) {
  return t.release_date ? new Date(t.release_date).getFullYear() : null;
}

function DiscoRow({ track, idx }) {
  const y = yearOf(track);
  const url = listenUrl(track);
  const sub = [y, track.genre].filter(Boolean).join(' · ');
  return (
    <div className="disco-item">
      <div className="disco-num">{String(idx).padStart(2, '0')}</div>
      <div className="disco-art">
        {track.cover_image_url && <img src={track.cover_image_url} alt={track.title} />}
      </div>
      <div className="disco-title">
        {track.title}
        {sub && <small>{sub}</small>}
      </div>
      {url ? (
        <a
          className="disco-play"
          href={externalHref(url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Play ${track.title}`}
        />
      ) : (
        <span className="disco-play" aria-hidden="true" />
      )}
    </div>
  );
}

// i. Featured Playlist (proto pickup pinned card + merged disco list)
export function SunsetFeaturedPlaylist({ playlistTracks, artist, lang, num }) {
  if (!playlistTracks || playlistTracks.length === 0) return null;
  const [pinned, ...others] = playlistTracks;
  const py = yearOf(pinned);
  const tag = py
    ? lang === 'en'
      ? `Latest Release · ${py}`
      : `最新リリース · ${py}`
    : lang === 'en'
    ? 'Featured'
    : '注目';
  const purl = listenUrl(pinned);
  const vibes = (artist?.moods || []).filter(Boolean).slice(0, 3);
  const bars = Array.from({ length: 12 });

  return (
    <section className="pickup" id="featured">
      <div className="container">
        <div className="section-num">{num}.</div>
        <div className="section-label">Featured Playlist</div>
        <div className="pickup-card">
          <div className="pickup-meta">
            <span className="pickup-tag">{tag}</span>
            <h2 className="pickup-title">{pinned.title}</h2>
            {pinned.genre && <p className="pickup-feat">{pinned.genre}</p>}
            {vibes.length > 0 && (
              <div className="pickup-vibes">
                {vibes.map((v, i) => (
                  <span className="vibe-tag" key={i}>
                    ✦ {v}
                  </span>
                ))}
              </div>
            )}
            {purl && (
              <a className="play-button" href={externalHref(purl)} target="_blank" rel="noopener noreferrer">
                <span className="icon" />
                {lang === 'en' ? 'Listen now' : '試聴する'}
              </a>
            )}
          </div>
          <div className="pickup-visual">
            {pinned.cover_image_url ? (
              <img src={pinned.cover_image_url} alt={pinned.title} />
            ) : (
              <div className="cassette" />
            )}
            <div className="waveform-overlay">
              {bars.map((_, i) => (
                <div className="bar" key={i} style={{ animationDelay: `${(i % 8) * 0.1}s` }} />
              ))}
            </div>
          </div>
        </div>

        {others.length > 0 && (
          <div className="playlist-block">
            <div className="playlist-more">
              {lang === 'en' ? 'More from this playlist' : 'このプレイリストの他の楽曲'}
            </div>
            <div className="disco-list">
              {others.map((t, i) => (
                <DiscoRow key={t.id} track={t} idx={i + 2} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ii. Biography (members list omitted — no schema data)
export function SunsetBio({ artist, epk, lang, num }) {
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
      <div className="container">
        <div className="section-num">{num}.</div>
        <div className="section-label">Biography</div>
        <div className="bio-grid">
          <div className="bio-sidebar">
            {quote && <p className="pull-quote">{quote}</p>}
            {quote && (
              <p className="pull-quote-attr">
                {lang === 'en' ? '— Band statement' : '— バンドステートメント'}
              </p>
            )}
          </div>
          <div className="bio-content">
            <div className="bio-body">
              {paragraphs.length ? (
                paragraphs.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p>{artist?.name} — biography coming soon.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// iii. Sound & Mood
export function SunsetSoundMood({ scenes, lang, num }) {
  const list = (Array.isArray(scenes) ? scenes : []).filter(
    (s) => s && (s.title_en || s.title_jp || s.desc_en || s.desc_jp)
  );
  if (list.length === 0) return null;

  return (
    <section className="sound">
      <div className="container">
        <div className="section-num">{num}.</div>
        <div className="section-label">Sound &amp; Mood</div>
        <h2 className="mood-headline">
          {lang === 'en' ? (
            <>
              Made for the <em>moments</em> in between.
            </>
          ) : (
            <>
              あいだの<em>時間</em>に寄り添う。
            </>
          )}
        </h2>
        <div className="mood-scenes">
          {list.map((s, i) => {
            const title = lang === 'en' ? s.title_en || s.title_jp : s.title_jp || s.title_en;
            const desc = lang === 'en' ? s.desc_en || s.desc_jp : s.desc_jp || s.desc_en;
            return (
              <div className="scene-card" key={i}>
                <div className="scene-icon">{ROMAN[i + 1]}.</div>
                {title && <h3 className="scene-title">{title}</h3>}
                {desc && <p className="scene-desc">{desc}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// iv. For Fans Of (dark section)
export function SunsetFansOf({ fans, influences, lang, num }) {
  let list = [];
  if (Array.isArray(fans) && fans.length > 0) {
    list = fans.filter((f) => f && f.name).map((f) => ({ name: f.name, tag: f.tag || '' }));
  } else if (Array.isArray(influences) && influences.length > 0) {
    list = influences.filter(Boolean).map((n) => ({ name: n, tag: '' }));
  }
  if (list.length === 0) return null;

  return (
    <section className="fans">
      <div className="container">
        <div className="section-num">{num}.</div>
        <div className="section-label">For Fans Of</div>
        <h2 className="section-h2">
          {lang === 'en' ? (
            <>
              If you <em>love</em>…
            </>
          ) : (
            <>
              こんな音楽が<em>好きなら</em>…
            </>
          )}
        </h2>
        <div className="fans-grid">
          {list.map((f, i) => (
            <div className="fan-card" key={i}>
              <div className="fan-num">{ROMAN[i + 1]}.</div>
              <div className="fan-name">{f.name}</div>
              {f.tag && <div className="fan-tag">{f.tag}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// v. Live & Tour Highlights
export function SunsetTour({ tour, lang, num }) {
  const rows = Array.isArray(tour) ? tour : [];
  if (rows.length === 0) return null;
  const highlights = rows.filter((t) => t.is_highlight);
  const timeline = rows.filter((t) => !t.is_highlight);

  return (
    <section className="tour">
      <div className="container">
        <div className="section-num">{num}.</div>
        <div className="section-label">Live &amp; Tour Highlights</div>
        {highlights.length > 0 && (
          <div className="tour-headline">
            {highlights.map((h) => {
              const label =
                h.highlight_label || (lang === 'en' ? h.event_en : h.event_jp || h.event_en);
              return (
                <div className="tour-stat" key={h.id}>
                  <div className="tour-stat-num">
                    {h.highlight_count != null ? `${String(h.highlight_count).padStart(2, '0')}×` : '★'}
                  </div>
                  {label && <div className="tour-stat-label">{label}</div>}
                  {h.location && <div className="tour-stat-detail">{h.location}</div>}
                </div>
              );
            })}
          </div>
        )}
        {timeline.length > 0 && (
          <div className="tour-timeline">
            {timeline.map((t) => {
              const event = lang === 'en' ? t.event_en || t.event_jp : t.event_jp || t.event_en;
              return (
                <div className="tour-item" key={t.id}>
                  {t.year && <div className="tour-year">{t.year}</div>}
                  <div className="tour-event">{event}</div>
                  {t.location && <div className="tour-location">{t.location}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// vi. Press & Recognition
export function SunsetPress({ press, lang, num }) {
  const rows = Array.isArray(press) ? press : [];
  if (rows.length === 0) return null;

  return (
    <section className="press">
      <div className="container">
        <div className="section-num">{num}.</div>
        <div className="section-label">Press &amp; Recognition</div>
        <h2 className="section-h2">
          {lang === 'en' ? (
            <>
              <em>Quiet</em> recognition.
            </>
          ) : (
            <>
              <em>静かな</em>評価。
            </>
          )}
        </h2>
        <div className="press-grid">
          {rows.map((p) => {
            const quote = lang === 'en' ? p.quote_en || p.quote_jp : p.quote_jp || p.quote_en;
            return (
              <div className="press-item" key={p.id}>
                {quote && <p className="press-quote">{quote}</p>}
                {p.source_url ? (
                  <a className="press-source" href={externalHref(p.source_url)} target="_blank" rel="noopener noreferrer">
                    {p.source}
                  </a>
                ) : (
                  <div className="press-source">{p.source}</div>
                )}
                {p.date_label && <div className="press-date">{p.date_label}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// OTONAMI badge — existing Phase 2A strings + Response Rate (no open-rate data).
export function SunsetBadge({ stats, lang }) {
  const s = stats || {};
  const t = (en, jp) => (lang === 'en' ? en : jp);
  const showStats = (s.curators_reached || 0) >= 5;

  return (
    <section className="otonami-badge">
      <div className="otonami-badge-inner">
        <div className="otonami-eyebrow">
          {t('Pitched via OTONAMI', 'OTONAMI 経由でピッチ配信')}
        </div>
        <h2 className="otonami-h">
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
              <div className="otonami-stat-num">{s.curators_reached}</div>
              <div className="otonami-stat-label">{t('Curators Reached', 'リーチしたキュレーター')}</div>
            </div>
            <div>
              <div className="otonami-stat-num">{s.countries}</div>
              <div className="otonami-stat-label">{t('Countries', '国数')}</div>
            </div>
            <div>
              <div className="otonami-stat-num">{s.response_rate}%</div>
              <div className="otonami-stat-label">{t('Response Rate', '返信率')}</div>
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

// vii. Connect — existing Phase 2A strings.
export function SunsetConnect({ artist, epk, lang, num }) {
  const a = artist || {};
  const e = epk || {};
  const t = (en, jp) => (lang === 'en' ? en : jp);

  const links = [
    { url: a.website_url, label: t('Official Site', '公式サイト') },
    { url: a.spotify_url, label: 'Spotify' },
    { url: a.youtube_url, label: 'YouTube' },
    { url: a.instagram_url, label: 'Instagram' },
    { url: a.twitter_url, label: 'X / Twitter' },
    { url: a.facebook_url, label: 'Facebook' },
  ].filter((l) => l.url);

  const contacts = [
    e.contact_management_email && {
      role: t('Management', 'マネジメント'),
      name: e.contact_management_name,
      email: e.contact_management_email,
    },
    e.contact_sync_email && {
      role: t('Sync / Licensing', 'シンク / ライセンス'),
      name: e.contact_sync_name,
      email: e.contact_sync_email,
    },
    e.contact_press_email && {
      role: t('Press Inquiries', 'プレスお問い合わせ'),
      name: 'OTONAMI Press Desk',
      email: e.contact_press_email,
    },
  ].filter(Boolean);

  return (
    <section className="connect" id="connect">
      <div className="container">
        <div className="section-num">{num}.</div>
        <div className="section-label">Connect</div>
        <div className="connect-grid">
          <div>
            <h2 className="connect-h">
              {lang === 'en' ? (
                <>
                  Get in <em>touch.</em>
                </>
              ) : (
                <em>お問い合わせ</em>
              )}
            </h2>
            <p className="connect-desc">
              {t(
                'For licensing, sync, press inquiries, and curator partnerships, please reach the team directly.',
                'ライセンス、シンク、プレス、キュレーター連携のご相談は、直接チームまでご連絡ください。'
              )}
            </p>
            {links.length > 0 && (
              <div className="connect-buttons">
                {links.map((l, i) => (
                  <a
                    key={i}
                    className="connect-button"
                    href={externalHref(l.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          {contacts.length > 0 && (
            <div className="connect-contacts">
              {contacts.map((c, i) => (
                <div className="contact-block" key={i}>
                  <div className="contact-role">{c.role}</div>
                  {c.name && <div className="contact-name">{c.name}</div>}
                  <a className="contact-email" href={`mailto:${c.email}`}>
                    {c.email}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
