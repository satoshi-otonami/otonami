'use client';

import { DT as D } from '@/lib/design-tokens';

/* Data comes pre-filtered from the server (getPublishedLpCases in lib/lp-cases.js).
   Do not import lib/lp-cases here — that would ship unpublished cards in the client bundle. */

/* LP palette (matches How it works / For Artists light sections) */
const P = {
  bg:      '#faf8f5',
  card:    '#ffffff',
  border:  '#ece6dc',
  text:    '#1a1a1a',
  textSec: '#6b6560',
  accent:  '#c4956a',
  dark:    '#1a1a1a',
  darkSub: '#d8d2c8',
};

const FONT = "'DM Sans', sans-serif";

/* Same rotation as the curator marquee's initial-circle avatars */
const AVATAR_COLORS = ['#FF6B4A', '#4ECDC4', '#A78BFA', '#FF3D6E'];

function Initials({ name, size = 44 }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const color = AVATAR_COLORS[[...(name || '')].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, background: color,
      color: '#fff', fontSize: Math.round(size * 0.42), fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {initial}
    </span>
  );
}

/* Round icon, or the initial circle when there is no image */
function Avatar({ image, name, size = 44 }) {
  if (!image) return <Initials name={name} size={size} />;
  return (
    <img src={image.src} alt={name} width={size} height={size} loading="lazy" decoding="async"
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
  );
}

/* Wide photo in a fixed-ratio frame */
function Photo({ image, alt, className }) {
  return (
    <div className={className}>
      <img src={image.src} alt={alt} width={image.width} height={image.height} loading="lazy" decoding="async" />
    </div>
  );
}

const pick = (v, lang) => (v ? v[lang] ?? v.ja : null);

/* JA「a」「b」 / EN "a" and "b" */
function formatTracks(tracks, lang) {
  if (lang === 'en') return tracks.map((t) => `"${t}"`).join(' and ');
  return tracks.map((t) => `「${t}」`).join('');
}

function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="lpc-link">
      {children}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17L17 7" /><path d="M8 7h9v9" />
      </svg>
    </a>
  );
}

function AnonCard({ item, lang }) {
  return (
    <div className="lpc-card">
      {item.subject && <h3 className="lpc-card__subject">{pick(item.subject, lang)}</h3>}
      <p className="lpc-card__body">{pick(item.body, lang)}</p>
    </div>
  );
}

function CuratorCard({ card, lang }) {
  const quote = card.quote;
  return (
    <div className="lpc-card lpc-card--curator">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar image={card.photoUrl ? { src: card.photoUrl } : null} name={card.name} />
        <div>
          <h3 className="lpc-card__subject" style={{ margin: 0 }}>{card.name}</h3>
          <p className="lpc-card__meta">{pick(card.descriptor, lang)}</p>
        </div>
      </div>
      {card.statement && <p className="lpc-card__body">{pick(card.statement, lang)}</p>}
      {/* Quote is shown in the original English in both languages */}
      {quote && (
        <blockquote className="lpc-quote">
          <p style={{ margin: 0 }}>{quote.text}</p>
          <cite>— {quote.attribution}</cite>
        </blockquote>
      )}
      {card.link && <ExternalLink href={card.link}>{card.name}</ExternalLink>}
    </div>
  );
}

function StoryCard({ story, lang }) {
  return (
    <div className="lpc-card lpc-story">
      {story.artistPhoto
        ? <Photo image={story.artistPhoto} alt={story.artist} className="lpc-photo lpc-story__photo" />
        : <div className="lpc-story__photo lpc-story__photo--empty"><Initials name={story.artist} size={72} /></div>}
      <div className="lpc-story__text">
        <p className="lpc-story__names">
          <span>{story.artist}</span>
          <span aria-hidden="true" style={{ color: P.accent, fontWeight: 400 }}>×</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Avatar image={story.curatorIcon} name={story.curator} size={32} />
            {story.curator}
          </span>
        </p>
        <p className="lpc-card__body lpc-story__body">{pick(story.body, lang)}</p>
        <div className="lpc-links">
          {story.links.map((l) => (
            <ExternalLink key={l.href} href={l.href}>{pick(l.label, lang)}</ExternalLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArtistCard({ card, lang }) {
  const named = card.resultNamed;
  return (
    <div className={`lpc-card${card.photo ? ' lpc-card--artist' : ''}`}>
      {card.photo
        ? <Photo image={card.photo} alt={card.name} className="lpc-photo lpc-artist__photo" />
        : <Initials name={card.name} />}
      <h3 className="lpc-card__subject" style={{ margin: 0 }}>{card.name}</h3>
      <p className="lpc-card__tracks">{formatTracks(card.tracks, lang)}</p>
      <p className="lpc-card__body">{named ? pick(named, lang) : pick(card.result, lang)}</p>
      {named?.link && <ExternalLink href={named.link}>NEO-CITY POP</ExternalLink>}
    </div>
  );
}

export default function LpCases({ data, lang }) {
  if (!data) return null;
  const { intro, guarantee, anon, curators, stories, artists } = data;

  return (
    <section id="results" style={{ background: P.bg, padding: '72px 0', scrollMarginTop: 90, fontFamily: FONT }}>
      <style>{`
        .lpc-wrap { max-width: 1000px; margin: 0 auto; padding: 0 20px; display: flex; flex-direction: column; gap: 20px; }
        .lpc-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
        .lpc-card { background: ${P.card}; border: 1px solid ${P.border}; border-radius: 16px; padding: 22px;
          display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; min-width: 0; }
        .lpc-card__subject { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.5; color: ${P.text}; }
        .lpc-card__body { margin: 0; font-size: 14px; line-height: 1.8; color: ${P.textSec}; }
        .lpc-card__meta { margin: 2px 0 0; font-size: 12px; color: ${P.textSec}; }
        .lpc-card__tracks { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.6; color: ${P.text}; }
        .lpc-story__names { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
          font-size: 18px; font-weight: 700; color: ${P.text}; }
        .lpc-links { display: flex; flex-wrap: wrap; gap: 8px 20px; }
        .lpc-link { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; font-size: 14px;
          font-weight: 600; color: ${P.accent}; text-decoration: none; }
        .lpc-link:hover { color: #a87a52; text-decoration: underline; }
        .lpc-quote { margin: 0; padding: 0; font-size: 14px; line-height: 1.8; color: ${P.text}; font-style: italic; }
        .lpc-quote cite { display: block; margin-top: 6px; font-size: 12px; font-style: normal; color: ${P.textSec}; }
        .lpc-photo { overflow: hidden; background: #f1ece4; }
        .lpc-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .lpc-card--artist { padding-top: 0; overflow: hidden; }
        .lpc-artist__photo { margin: 0 -22px 6px; aspect-ratio: 16 / 9; }
        .lpc-story { padding: 0; overflow: hidden; gap: 0; }
        .lpc-story__photo { aspect-ratio: 3 / 2; }
        .lpc-story__photo--empty { display: flex; align-items: center; justify-content: center; background: #f1ece4; }
        .lpc-story__text { padding: 22px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .lpc-guarantee { background: ${P.dark}; border-radius: 16px; padding: 22px 24px; margin-top: 8px; }
        .lpc-guarantee p { margin: 0; font-size: 14px; line-height: 1.8; color: ${P.darkSub}; }
        @media (min-width: 769px) {
          .lpc-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .lpc-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lpc-story { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); }
          .lpc-story__photo { aspect-ratio: auto; min-height: 100%; }
          .lpc-story__text { padding: 28px 32px; justify-content: center; }
          .lpc-story__body { font-size: 15px; }
          .lpc-heading { word-break: keep-all; }
        }
      `}</style>

      <div className="lpc-wrap">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '3px', color: P.accent, textTransform: 'uppercase', marginBottom: 16 }}>
            {pick(intro.eyebrow, lang)}
          </div>
          <h2 className="lpc-heading" style={{ fontFamily: D.fHead, fontSize: 'clamp(26px, 4.5vw, 38px)', fontWeight: 700, color: P.text, lineHeight: 1.3, margin: '0 0 16px' }}>
            {pick(intro.heading, lang)}
          </h2>
          <p style={{ maxWidth: 680, margin: '0 auto', fontSize: 15, lineHeight: 1.9, color: P.textSec }}>
            {pick(intro.lead, lang)}
          </p>
        </div>

        {/* ① Anonymous cases */}
        {anon.length > 0 && (
          <div className="lpc-grid lpc-grid--3">
            {anon.map((item) => <AnonCard key={item.id} item={item} lang={lang} />)}
          </div>
        )}

        {/* ② Named curators — whole tier hidden until someone is published */}
        {curators.length > 0 && (
          <div className="lpc-grid lpc-grid--2">
            {curators.map((card) => <CuratorCard key={card.id} card={card} lang={lang} />)}
          </div>
        )}

        {/* ③ Stories with both names, then named artist cards */}
        {stories.map((story) => <StoryCard key={story.id} story={story} lang={lang} />)}
        {artists.length > 0 && (
          <div className="lpc-grid lpc-grid--2">
            {artists.map((card) => <ArtistCard key={card.id} card={card} lang={lang} />)}
          </div>
        )}

        <div className="lpc-guarantee">
          <p>{pick(guarantee, lang)}</p>
        </div>
      </div>
    </section>
  );
}
