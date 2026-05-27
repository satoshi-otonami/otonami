'use client';
import { useState, useEffect } from 'react';
import { EDITORIAL_DARK_CSS } from './editorialDarkCss';
import HeroSection from '../sections/HeroSection';
import FeaturedTrackSection from '../sections/FeaturedTrackSection';
import BioSection from '../sections/BioSection';
import OtonamiBadgeSection from '../sections/OtonamiBadgeSection';
import ConnectSection from '../sections/ConnectSection';

function Topbar({ lang, setLang }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span>
          <span className="dot" />
          Live EPK
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
        <a href="#connect">Contact</a>
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
  const { epk, artist, featured_track, tracks, pitch_stats } = data;
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

  return (
    <div className="epk-root">
      <style dangerouslySetInnerHTML={{ __html: EDITORIAL_DARK_CSS }} />
      <Topbar lang={lang} setLang={setLang} />
      <HeroSection artist={artist} epk={epk} tracks={tracks} lang={lang} />
      {featured_track && (
        <div className="epk-reveal">
          <FeaturedTrackSection track={featured_track} epk={epk} lang={lang} />
        </div>
      )}
      <div className="epk-reveal">
        <BioSection artist={artist} epk={epk} lang={lang} />
      </div>
      <div className="epk-reveal">
        <OtonamiBadgeSection stats={pitch_stats} />
      </div>
      <div className="epk-reveal">
        <ConnectSection artist={artist} epk={epk} />
      </div>
      <Footer artist={artist} epk={epk} />
    </div>
  );
}
