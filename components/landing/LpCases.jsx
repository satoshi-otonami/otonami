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
    <div className="lpc-card lpc-card--anon">
      {item.subject && <h3 className="lpc-anon__subject">{pick(item.subject, lang)}</h3>}
      <p className="lpc-anon__body">{pick(item.body, lang)}</p>
    </div>
  );
}

/* One shape for every named result: 16:9 photo on top, then name, track(s),
   result and link(s). Artist cards and the artist × curator story both render
   through this so the three sit side by side at the same size. */
function FeaturedCard({ photo, alt, names, tracks, result, links, lang }) {
  return (
    <div className="lpc-card lpc-featured">
      {photo
        ? <Photo image={photo} alt={alt} className="lpc-photo lpc-featured__photo" />
        : <div className="lpc-featured__photo lpc-featured__photo--empty"><Initials name={alt} size={64} /></div>}
      <div className="lpc-featured__text">
        <h3 className="lpc-featured__names">{names}</h3>
        {tracks?.length > 0 && <p className="lpc-card__tracks">{formatTracks(tracks, lang)}</p>}
        <p className="lpc-card__body">{result}</p>
        {links.length > 0 && (
          <div className="lpc-links">
            {links.map((l) => <ExternalLink key={l.href} href={l.href}>{l.label}</ExternalLink>)}
          </div>
        )}
      </div>
    </div>
  );
}

function ArtistCard({ card, lang }) {
  const named = card.resultNamed;
  return (
    <FeaturedCard
      photo={card.photo}
      alt={card.name}
      names={card.name}
      tracks={card.tracks}
      result={named ? pick(named, lang) : pick(card.result, lang)}
      links={named?.link ? [{ href: named.link, label: 'NEO-CITY POP' }] : []}
      lang={lang}
    />
  );
}

function StoryCard({ story, lang }) {
  return (
    <FeaturedCard
      photo={story.artistPhoto}
      alt={story.artist}
      names={(
        <>
          <span>{story.artist}</span>
          <span aria-hidden="true" style={{ color: P.accent, fontWeight: 400 }}>×</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Avatar image={story.curatorIcon} name={story.curator} size={22} />
            {story.curator}
          </span>
        </>
      )}
      tracks={story.tracks}
      result={pick(story.body, lang)}
      links={story.links.map((l) => ({ href: l.href, label: pick(l.label, lang) }))}
      lang={lang}
    />
  );
}

/* Curator quote band. The quote stays in the original English in both languages. */
function QuoteBand({ card, lang }) {
  return (
    <figure className="lpc-card lpc-quoteband">
      <Avatar image={card.photo} name={card.name} size={56} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <blockquote className="lpc-quote" lang="en">
          <p style={{ margin: 0 }}>&ldquo;{card.quote.text}&rdquo;</p>
        </blockquote>
        <figcaption className="lpc-quoteband__cap">
          <span>
            <strong style={{ color: P.text }}>{card.name}</strong>
            <span style={{ color: P.textSec }}> · {pick(card.descriptor, lang)}</span>
          </span>
          {card.link && <ExternalLink href={card.link}>{card.linkLabel || card.name}</ExternalLink>}
        </figcaption>
      </div>
    </figure>
  );
}

export default function LpCases({ data, lang }) {
  if (!data) return null;
  const { intro, guarantee, anon, curators, stories, artists } = data;
  const quoted = curators.filter((c) => c.quote);

  return (
    <section id="results" style={{ background: P.bg, padding: '48px 0', scrollMarginTop: 90, fontFamily: FONT }}>
      <style>{`
        .lpc-wrap { max-width: 1000px; margin: 0 auto; padding: 0 20px; display: flex; flex-direction: column; gap: 16px; }
        .lpc-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
        .lpc-card { background: ${P.card}; border: 1px solid ${P.border}; border-radius: 16px; padding: 20px;
          display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; min-width: 0; }
        .lpc-card__body { margin: 0; font-size: 13.5px; line-height: 1.7; color: ${P.textSec}; }
        .lpc-card__tracks { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.6; color: ${P.text}; }
        .lpc-links { display: flex; flex-direction: column; align-items: flex-start; margin-top: auto; padding-top: 2px; }
        .lpc-link { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; font-size: 13px;
          font-weight: 600; color: ${P.accent}; text-decoration: none; }
        .lpc-link:hover { color: #a87a52; text-decoration: underline; }
        .lpc-photo { overflow: hidden; background: #f1ece4; }
        .lpc-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .lpc-featured { padding: 0; overflow: hidden; gap: 0; }
        .lpc-featured__photo { aspect-ratio: 2 / 1; }
        .lpc-featured__photo--empty { display: flex; align-items: center; justify-content: center; background: #f1ece4; }
        .lpc-featured__text { padding: 16px 18px 6px; display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
        .lpc-featured__names { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px;
          font-size: 16px; font-weight: 700; line-height: 1.4; color: ${P.text}; }
        .lpc-quoteband { flex-direction: row; align-items: flex-start; gap: 16px; margin: 0; padding: 16px 22px 8px; }
        .lpc-quote { margin: 0; padding: 0; font-size: 15px; line-height: 1.75; color: ${P.text}; font-style: italic; }
        .lpc-quoteband__cap { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
          gap: 0 16px; margin-top: 4px; font-size: 13px; }
        .lpc-card--anon { padding: 14px 16px; gap: 2px; background: transparent; }
        .lpc-anon__subject { margin: 0; font-size: 14px; font-weight: 700; line-height: 1.5; color: ${P.text}; }
        .lpc-anon__body { margin: 0; font-size: 12.5px; line-height: 1.65; color: ${P.textSec}; }
        .lpc-note { margin: 4px 0 0; text-align: center; font-size: 12.5px; line-height: 1.8; color: ${P.textSec}; }
        .lpc-note a { color: ${P.accent}; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .lpc-note a:hover { text-decoration: underline; }
        @media (min-width: 769px) {
          .lpc-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .lpc-heading { word-break: keep-all; }
        }
      `}</style>

      <div className="lpc-wrap">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
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

        {/* ① Named results, same size and shape. Artist cards first, the
            artist × curator story last (ROUTE14band closes the row). */}
        {(artists.length > 0 || stories.length > 0) && (
          <div className="lpc-grid lpc-grid--3">
            {artists.map((card) => <ArtistCard key={card.id} card={card} lang={lang} />)}
            {stories.map((story) => <StoryCard key={story.id} story={story} lang={lang} />)}
          </div>
        )}

        {/* ② Curator quote(s), one band each */}
        {quoted.map((card) => <QuoteBand key={card.id} card={card} lang={lang} />)}

        {/* ③ Anonymous cases, compact */}
        {anon.length > 0 && (
          <div className="lpc-grid lpc-grid--3">
            {anon.map((item) => <AnonCard key={item.id} item={item} lang={lang} />)}
          </div>
        )}

        <p className="lpc-note">
          {pick(guarantee, lang)}{' '}
          <a href="#guarantee">{lang === 'en' ? 'How the refund works →' : '返金の仕組み →'}</a>
        </p>
      </div>
    </section>
  );
}
