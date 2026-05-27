'use client';
import { useState, useEffect } from 'react';
import { EDITORIAL_DARK_CSS } from './editorialDarkCss';
import HeroSection from '../sections/HeroSection';
import FeaturedPlaylistSection from '../sections/FeaturedPlaylistSection';
import BioSection from '../sections/BioSection';
import SoundMoodSection from '../sections/SoundMoodSection';
import FansOfSection from '../sections/FansOfSection';
import TourSection from '../sections/TourSection';
import PressSection from '../sections/PressSection';
import OtonamiBadgeSection from '../sections/OtonamiBadgeSection';
import ConnectSection from '../sections/ConnectSection';

function Topbar({ lang, setLang }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span>
          <span className="dot" />
          {lang === 'en' ? 'Live EPK' : '公開中のEPK'}
        </span>
        <span>Issue №001</span>
      </div>
      <div className="topbar-right">
        <div className="lang-toggle">
          <button
            className={lang === 'en' ? 'active' : ''}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            className={lang === 'jp' ? 'active' : ''}
            onClick={() => setLang('jp')}
          >
            JP
          </button>
        </div>
        <a href="#connect">{lang === 'en' ? 'Contact' : 'お問い合わせ'}</a>
      </div>
    </div>
  );
}

function Footer({ artist, epk }) {
  const owner = epk?.contact_management_name
    ? ` · ${epk.contact_management_name}`
    : '';
  return (
    <footer className="epk-footer">
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

export default function EditorialDarkTheme({ data }) {
  const {
    epk,
    artist,
    playlist_tracks,
    tracks,
    press,
    tour,
    pitch_stats,
  } = data;
  const [lang, setLang] = useState('en');

  useEffect(() => {
    // Progressive scroll-reveal: only hide+animate when JS runs, so the
    // server-rendered content stays visible if JS fails.
    const els = Array.from(document.querySelectorAll('.epk-root .epk-reveal'));
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

  // Mirror each section's self-hide guard so the data-no sequence stays
  // contiguous when a section is empty (e.g. Press hidden -> no gap).
  const influences = artist?.influences;
  const has = {
    playlist: (playlist_tracks?.length || 0) > 0,
    sound:
      Array.isArray(epk?.sound_scenes) &&
      epk.sound_scenes.some(
        (s) => s && (s.title_en || s.title_jp || s.desc_en || s.desc_jp)
      ),
    fans:
      (Array.isArray(epk?.for_fans_of) &&
        epk.for_fans_of.some((f) => f && f.name)) ||
      (Array.isArray(influences) && influences.filter(Boolean).length > 0),
    tour: (tour?.length || 0) > 0,
    press: (press?.length || 0) > 0,
  };
  let n = 0;
  const no = () => String(++n).padStart(2, '0');
  const num = {
    playlist: has.playlist ? no() : null,
    bio: no(),
    sound: has.sound ? no() : null,
    fans: has.fans ? no() : null,
    tour: has.tour ? no() : null,
    press: has.press ? no() : null,
    connect: no(),
  };

  return (
    <div className="epk-root">
      <style dangerouslySetInnerHTML={{ __html: EDITORIAL_DARK_CSS }} />
      <Topbar lang={lang} setLang={setLang} />
      <HeroSection artist={artist} epk={epk} tracks={tracks} lang={lang} />
      {has.playlist && (
        <div className="epk-reveal">
          <FeaturedPlaylistSection
            playlistTracks={playlist_tracks}
            lang={lang}
            num={num.playlist}
          />
        </div>
      )}
      <div className="epk-reveal">
        <BioSection artist={artist} epk={epk} lang={lang} num={num.bio} />
      </div>
      {has.sound && (
        <div className="epk-reveal">
          <SoundMoodSection
            scenes={epk.sound_scenes}
            lang={lang}
            num={num.sound}
          />
        </div>
      )}
      {has.fans && (
        <div className="epk-reveal">
          <FansOfSection
            fans={epk.for_fans_of}
            influences={influences}
            lang={lang}
            num={num.fans}
          />
        </div>
      )}
      {has.tour && (
        <div className="epk-reveal">
          <TourSection tour={tour} lang={lang} num={num.tour} />
        </div>
      )}
      {has.press && (
        <div className="epk-reveal">
          <PressSection press={press} lang={lang} num={num.press} />
        </div>
      )}
      <div className="epk-reveal">
        <OtonamiBadgeSection stats={pitch_stats} lang={lang} />
      </div>
      <div className="epk-reveal">
        <ConnectSection artist={artist} epk={epk} lang={lang} num={num.connect} />
      </div>
      <Footer artist={artist} epk={epk} />
    </div>
  );
}
