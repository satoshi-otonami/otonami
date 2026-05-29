'use client';
import { useState, useEffect } from 'react';
import { SUNSET_CITYPOP_CSS } from './sunsetCitypopCss';
import {
  SunsetFeaturedPlaylist,
  SunsetBio,
  SunsetSoundMood,
  SunsetFansOf,
  SunsetTour,
  SunsetPress,
  SunsetBadge,
  SunsetConnect,
} from './sunsetSections';

const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];

function Topbar({ lang, setLang }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span>
          <span className="dot" />
          {lang === 'en' ? 'Live EPK' : '公開中のEPK'}
        </span>
      </div>
      <div className="topbar-right">
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            <span>EN</span>
          </button>
          <button className={lang === 'jp' ? 'active' : ''} onClick={() => setLang('jp')}>
            <span>JP</span>
          </button>
        </div>
        <a href="#connect">{lang === 'en' ? 'Contact' : 'お問い合わせ'}</a>
      </div>
    </div>
  );
}

function Hero({ artist, epk, tour, lang }) {
  const name = artist?.name || 'Artist';
  // Hero press photo: profile cover only (NOT avatar_url / track cover_image_url).
  // Rendered object-fit:contain in a 3:2 frame so the subject is never cropped.
  const photo = artist?.cover_url || null;
  const parts = [artist?.region, artist?.label_name].filter(Boolean);
  const tagline =
    lang === 'en' ? epk?.tagline_en || epk?.tagline_jp : epk?.tagline_jp || epk?.tagline_en;
  const taglineText = tagline || (artist?.bio ? artist.bio.slice(0, 160) : '');
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Marquee ticker from real tour data (highlights + timeline). Hidden if empty.
  const rows = Array.isArray(tour) ? tour : [];
  const items = [];
  rows
    .filter((t) => t.is_highlight)
    .forEach((h) => {
      const label = h.highlight_label || h.event_en;
      if (label) items.push(h.highlight_count != null ? `${label} × ${h.highlight_count}` : label);
    });
  rows
    .filter((t) => !t.is_highlight)
    .forEach((t) => {
      const ev = lang === 'en' ? t.event_en || t.event_jp : t.event_jp || t.event_en;
      if (ev) items.push([ev, t.year].filter(Boolean).join(' '));
    });
  const ticker = items.length ? [...items, ...items] : [];

  return (
    <section className="hero">
      <div className="hero-sun" />
      <div className="hero-grid" />
      <div className="hero-content">
        <div className="hero-content-grid">
          <div className="hero-text">
            {parts.length > 0 && <div className="kicker">{parts.join(' · ')}</div>}
            <h1>{name}</h1>
            {taglineText && <p className="hero-tagline">{taglineText}</p>}
            <div className="hero-cta-row">
              <a className="btn-primary" href="#featured" onClick={scrollTo('featured')}>
                {lang === 'en' ? 'Hear our latest' : '最新曲を聴く'}
              </a>
              <a className="btn-ghost" href="#featured" onClick={scrollTo('featured')}>
                {lang === 'en' ? 'Browse catalog' : 'カタログを見る'}
              </a>
            </div>
          </div>
          {/* Framed 3:2 photo card. img only when cover_url exists; otherwise the
              card's gradient matte shows (no empty frame). Caption is name-driven. */}
          <div className="hero-photo-card">
            {photo && <img src={photo} alt={name} />}
            {photo && (
              <span className="hero-photo-cap">
                {name} · {lang === 'en' ? 'Live' : 'ライブ'}
              </span>
            )}
          </div>
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
    <footer className="sc-footer">
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

export default function SunsetCitypopTheme({ data }) {
  const { epk, artist, playlist_tracks, press, tour, pitch_stats } = data;
  const [lang, setLang] = useState('en');

  useEffect(() => {
    // Progressive scroll-reveal: hide+animate only when JS runs, so the
    // server-rendered content stays visible if JS fails.
    const els = Array.from(
      document.querySelectorAll('.theme-sunset-citypop section:not(.hero)')
    );
    if (!('IntersectionObserver' in window) || els.length === 0) return;
    els.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
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

  // Same self-hide guards as editorial, so the roman numbering stays contiguous.
  const influences = artist?.influences;
  const has = {
    playlist: (playlist_tracks?.length || 0) > 0,
    sound:
      Array.isArray(epk?.sound_scenes) &&
      epk.sound_scenes.some(
        (s) => s && (s.title_en || s.title_jp || s.desc_en || s.desc_jp)
      ),
    fans:
      (Array.isArray(epk?.for_fans_of) && epk.for_fans_of.some((f) => f && f.name)) ||
      (Array.isArray(influences) && influences.filter(Boolean).length > 0),
    tour: (tour?.length || 0) > 0,
    press: (press?.length || 0) > 0,
  };
  let n = 0;
  const next = () => ROMAN[++n];
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
    <div className="epk-root theme-sunset-citypop">
      <style dangerouslySetInnerHTML={{ __html: SUNSET_CITYPOP_CSS }} />
      <Topbar lang={lang} setLang={setLang} />
      <Hero artist={artist} epk={epk} tour={tour} lang={lang} />
      {has.playlist && (
        <SunsetFeaturedPlaylist
          playlistTracks={playlist_tracks}
          artist={artist}
          lang={lang}
          num={num.playlist}
        />
      )}
      <SunsetBio artist={artist} epk={epk} lang={lang} num={num.bio} />
      {has.sound && (
        <SunsetSoundMood scenes={epk.sound_scenes} lang={lang} num={num.sound} />
      )}
      {has.fans && (
        <SunsetFansOf
          fans={epk.for_fans_of}
          influences={influences}
          lang={lang}
          num={num.fans}
        />
      )}
      {has.tour && <SunsetTour tour={tour} lang={lang} num={num.tour} />}
      {has.press && <SunsetPress press={press} lang={lang} num={num.press} />}
      <SunsetBadge stats={pitch_stats} lang={lang} />
      <SunsetConnect artist={artist} epk={epk} lang={lang} num={num.connect} />
      <Footer artist={artist} epk={epk} />
    </div>
  );
}
