'use client';
import { useState, useEffect } from 'react';
import { BRUTALIST_CSS } from './brutalistCss';
import {
  BrutalistFeaturedPlaylist,
  BrutalistBio,
  BrutalistSoundMood,
  BrutalistFansOf,
  BrutalistTour,
  BrutalistPress,
  BrutalistBadge,
  BrutalistConnect,
} from './brutalistSections';

function yearOf(t) {
  return t?.release_date ? new Date(t.release_date).getFullYear() : null;
}

function Topbar({ artist, lang, setLang }) {
  return (
    <div className="topbar">
      <div className="topbar-logo">{artist?.name || 'Artist'}</div>
      <div className="topbar-meta">/ EPK · Issue №001</div>
      <div className="lang-toggle">
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
          EN
        </button>
        <button className={lang === 'jp' ? 'active' : ''} onClick={() => setLang('jp')}>
          JP
        </button>
      </div>
      <a href="#connect">{lang === 'en' ? 'Contact' : 'お問い合わせ'}</a>
    </div>
  );
}

function Hero({ artist, epk, playlistTracks, tour, lang }) {
  const name = artist?.name || 'Artist';
  const tagline =
    lang === 'en' ? epk?.tagline_en || epk?.tagline_jp : epk?.tagline_jp || epk?.tagline_en;
  const taglineText = tagline || (artist?.bio ? artist.bio.slice(0, 160) : '');

  // Data-driven meta grid — only cells we actually have, capped at 4.
  const genres = Array.isArray(artist?.genres) ? artist.genres.filter(Boolean) : [];
  const metaCells = [
    artist?.region && { label: lang === 'en' ? 'Origin' : '拠点', value: artist.region },
    artist?.label_name && { label: lang === 'en' ? 'Label' : 'レーベル', value: artist.label_name },
    genres[0] && { label: lang === 'en' ? 'Genre' : 'ジャンル', value: genres[0] },
    genres[1] && { label: lang === 'en' ? 'Style' : 'スタイル', value: genres[1] },
  ].filter(Boolean).slice(0, 4);

  const photo = artist?.cover_url || artist?.avatar_url || null;
  const pinned = Array.isArray(playlistTracks) && playlistTracks.length ? playlistTracks[0] : null;
  const pinnedYear = yearOf(pinned);

  // Marquee ticker from real tour data (highlights + timeline). Hidden if empty.
  const rows = Array.isArray(tour) ? tour : [];
  const items = [];
  rows
    .filter((t) => t.is_highlight)
    .forEach((h) => {
      const label = h.highlight_label || h.event_en;
      if (label)
        items.push(
          h.highlight_count != null ? `${label} × ${h.highlight_count}` : label
        );
    });
  rows
    .filter((t) => !t.is_highlight)
    .forEach((t) => {
      const ev = lang === 'en' ? t.event_en || t.event_jp : t.event_jp || t.event_en;
      if (ev) items.push([ev, t.year].filter(Boolean).join(' · '));
    });
  const ticker = items.length ? [...items, ...items] : [];

  return (
    <section className="hero">
      <div className="hero-issue-bar">
        <span>◉ {lang === 'en' ? 'Live EPK' : '公開中のEPK'}</span>
        {artist?.region && <span className="hide-sm">· {artist.region}</span>}
        {genres[0] && <span className="hide-sm">· {genres[0]}</span>}
        {pinned ? (
          <span className="red">
            → {lang === 'en' ? 'Latest' : '最新'}: {pinned.title}
          </span>
        ) : (
          <span className="red" />
        )}
        {pinnedYear && <span className="hide-sm">{pinnedYear}</span>}
      </div>

      <div className="hero-main">
        <div className="hero-left">
          <div>
            <div className="hero-eyebrow">FOR CURATORS · PRESS · SYNC</div>
            <h1>{name}</h1>
            {taglineText && <p className="hero-subhead">{taglineText}</p>}
          </div>
          {metaCells.length > 0 && (
            <div className="hero-meta-grid">
              {metaCells.map((c, i) => (
                <div key={i}>
                  {c.label}
                  <strong>{c.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`hero-right${photo ? ' has-photo' : ''}`}>
          {photo ? (
            <img src={photo} alt={name} />
          ) : (
            <div className="hero-right-visual">
              <svg
                viewBox="0 0 400 500"
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g opacity="0.55" stroke="#F4F0E8" strokeWidth="1" fill="none">
                  <circle cx="200" cy="170" r="68" />
                  <path d="M132 240 Q200 285 268 240 L268 400 Q200 425 132 400 Z" />
                  <line x1="168" y1="265" x2="168" y2="370" />
                  <line x1="232" y1="265" x2="232" y2="370" />
                </g>
                <g stroke="#E63946" strokeWidth="1.5" fill="none" opacity="0.7">
                  <rect x="20" y="20" width="50" height="50" />
                  <rect x="330" y="430" width="50" height="50" />
                </g>
              </svg>
            </div>
          )}
          <div className="reg-mark tl" />
          <div className="reg-mark tr" />
          <div className="reg-mark bl" />
          <div className="reg-mark br" />
        </div>
      </div>

      {ticker.length > 0 && (
        <div className="hero-ticker">
          <div className="hero-ticker-inner">
            {ticker.map((it, i) => (
              <span key={i}>{it}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Footer({ artist, epk }) {
  const owner = epk?.contact_management_name ? ` · ${epk.contact_management_name}` : '';
  return (
    <footer className="br-footer">
      <div>
        © {new Date().getFullYear()} {artist?.name}
        {owner}
      </div>
      <div>
        Powered by{' '}
        <a href="https://otonami.io" target="_blank" rel="noopener noreferrer">
          OTONAMI
        </a>
      </div>
    </footer>
  );
}

export default function BrutalistTheme({ data }) {
  const { epk, artist, playlist_tracks, press, tour, pitch_stats } = data;
  const [lang, setLang] = useState('en');

  useEffect(() => {
    // Progressive scroll-reveal: hide+animate only when JS runs, so the
    // server-rendered content stays visible if JS fails.
    const els = Array.from(document.querySelectorAll('.theme-brutalist section:not(.hero)'));
    if (!('IntersectionObserver' in window) || els.length === 0) return;
    els.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'none';
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Self-hide guards (same as editorial/sunset), so the numbering stays contiguous.
  const influences = artist?.influences;
  const has = {
    playlist: (playlist_tracks?.length || 0) > 0,
    sound:
      Array.isArray(epk?.sound_scenes) &&
      epk.sound_scenes.some((s) => s && (s.title_en || s.title_jp || s.desc_en || s.desc_jp)),
    fans:
      (Array.isArray(epk?.for_fans_of) && epk.for_fans_of.some((f) => f && f.name)) ||
      (Array.isArray(influences) && influences.filter(Boolean).length > 0),
    tour: (tour?.length || 0) > 0,
    press: (press?.length || 0) > 0,
  };
  let n = 0;
  const next = () => String(++n).padStart(2, '0');
  const num = {
    playlist: has.playlist ? next() : null,
    bio: next(),
    sound: has.sound ? next() : null,
    fans: has.fans ? next() : null,
    tour: has.tour ? next() : null,
    press: has.press ? next() : null,
    connect: next(),
  };

  return (
    <div className="epk-root theme-brutalist">
      <style dangerouslySetInnerHTML={{ __html: BRUTALIST_CSS }} />
      <Topbar artist={artist} lang={lang} setLang={setLang} />
      <Hero
        artist={artist}
        epk={epk}
        playlistTracks={playlist_tracks}
        tour={tour}
        lang={lang}
      />
      {has.playlist && (
        <BrutalistFeaturedPlaylist
          playlistTracks={playlist_tracks}
          artist={artist}
          lang={lang}
          num={num.playlist}
        />
      )}
      <BrutalistBio artist={artist} epk={epk} lang={lang} num={num.bio} />
      {has.sound && <BrutalistSoundMood scenes={epk.sound_scenes} lang={lang} num={num.sound} />}
      {has.fans && (
        <BrutalistFansOf
          fans={epk.for_fans_of}
          influences={influences}
          lang={lang}
          num={num.fans}
        />
      )}
      {has.tour && <BrutalistTour tour={tour} lang={lang} num={num.tour} />}
      {has.press && <BrutalistPress press={press} lang={lang} num={num.press} />}
      <BrutalistBadge stats={pitch_stats} lang={lang} />
      <BrutalistConnect artist={artist} epk={epk} lang={lang} num={num.connect} />
      <Footer artist={artist} epk={epk} />
    </div>
  );
}
