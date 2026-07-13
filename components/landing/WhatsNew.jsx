'use client';

/* Light-section palette (section background is white, matching the marquee above) */
const P = {
  card:   '#FDF9F2',
  border: '#f0e9de',
  title:  '#1a1a1a',
  date:   '#a89f92',
  accent: '#c4956a',
  eyebrow:'#999',
};

const FONT = "'DM Sans', sans-serif";

const X_URL = 'https://x.com/otonami_io';
const IG_URL = 'https://www.instagram.com/otonami.io/';

/* Locale-stable date formatting (no Date.now / timezone drift on the server).
   "2026-07-13" → JP "2026年7月13日" / EN "Jul 13, 2026". */
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(iso, lang) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const month = parseInt(mo, 10);
  const day = parseInt(d, 10);
  if (lang === 'en') return `${EN_MONTHS[month - 1]} ${day}, ${y}`;
  return `${y}年${month}月${day}日`;
}

function UpdateRow({ update, lang }) {
  const title = (lang === 'en' ? update.titleEn : update.titleJa) || update.titleEn || update.titleJa;
  const dateStr = formatDate(update.publishedAt, lang);
  return (
    <li className="lp-wn-item">
      <span className="lp-wn-date">{dateStr}</span>
      {update.linkUrl ? (
        <a
          className="lp-wn-title lp-wn-title--link"
          href={update.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {title}
        </a>
      ) : (
        <span className="lp-wn-title">{title}</span>
      )}
    </li>
  );
}

export default function WhatsNew({ updates, lang }) {
  // 0 件時はセクションごと非表示（空枠を出さない）
  if (!updates || updates.length === 0) return null;

  return (
    <section style={{ background: '#ffffff', padding: '8px 0 44px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: P.eyebrow, textTransform: 'uppercase',
          letterSpacing: '2px', marginBottom: 20, fontFamily: FONT, textAlign: 'center',
        }}>
          {lang === 'en' ? "What's New" : '最新の紹介・アップデート'}
        </p>

        <ul className="lp-wn-list">
          {updates.map(u => (
            <UpdateRow key={u.id} update={u} lang={lang} />
          ))}
        </ul>

        <div className="lp-wn-social">
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="lp-wn-sociallink">
            {lang === 'en' ? 'See on X →' : 'Xで見る →'}
          </a>
          <a href={IG_URL} target="_blank" rel="noopener noreferrer" className="lp-wn-sociallink">
            {lang === 'en' ? 'See on Instagram →' : 'Instagramで見る →'}
          </a>
        </div>
      </div>

      <style>{`
        .lp-wn-list {
          list-style: none;
          margin: 0 0 20px;
          padding: 0;
          border-top: 1px solid ${P.border};
        }
        .lp-wn-item {
          display: flex;
          align-items: baseline;
          gap: 16px;
          padding: 14px 4px;
          border-bottom: 1px solid ${P.border};
        }
        .lp-wn-date {
          flex-shrink: 0;
          width: 108px;
          font-family: ${FONT};
          font-size: 12.5px;
          font-weight: 600;
          color: ${P.date};
          letter-spacing: 0.02em;
        }
        .lp-wn-title {
          font-family: ${FONT};
          font-size: 14.5px;
          font-weight: 500;
          line-height: 1.5;
          color: ${P.title};
        }
        .lp-wn-title--link {
          color: ${P.accent};
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.18s ease;
        }
        .lp-wn-title--link:hover { opacity: 0.72; }
        .lp-wn-social {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
        }
        .lp-wn-sociallink {
          font-family: ${FONT};
          font-size: 13px;
          font-weight: 600;
          color: ${P.accent};
          text-decoration: none;
        }
        .lp-wn-sociallink:hover { text-decoration: underline; }
        @media (max-width: 520px) {
          .lp-wn-item { flex-direction: column; gap: 3px; }
          .lp-wn-date { width: auto; }
        }
      `}</style>
    </section>
  );
}
