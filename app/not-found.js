import Link from 'next/link';

export const metadata = {
  title: '404 — OTONAMI',
  description: 'このページは見つかりませんでした。',
};

const LINKS = [
  { href: '/', ja: 'トップに戻る', en: 'Back to the top' },
  { href: '/studio', ja: 'スタジオを開く', en: 'Open the studio' },
  { href: '/artist', ja: 'アーティスト登録へ', en: 'Register as an artist' },
];

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0f0f1a',
        color: '#f0ede6',
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        {/* A bar of rest — four beats of silence, drawn as rests on a staff. */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'center' }}>
          <svg width="180" height="48" viewBox="0 0 180 48" fill="none" aria-hidden="true">
            {[8, 18, 28, 38].map((y) => (
              <line key={y} x1="10" y1={y} x2="170" y2={y} stroke="rgba(240,237,230,0.16)" strokeWidth="1" />
            ))}
            {[38, 74, 110, 146].map((x) => (
              <rect key={x} x={x} y="18" width="16" height="5" rx="1" fill="#c4956a" />
            ))}
          </svg>
        </div>

        <p
          style={{
            fontSize: 12,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#c4956a',
            marginBottom: 14,
          }}
        >
          404
        </p>

        <h1
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.35,
            margin: '0 0 14px',
          }}
        >
          ここは4小節休みです。
        </h1>

        <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(240,237,230,0.72)', margin: '0 0 8px' }}>
          お探しのページは、どうやらフェードアウトしたようです。
          <br />
          曲は止まっていないので、続きから入り直してください。
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(240,237,230,0.38)', margin: '0 0 32px' }}>
          Four bars of rest. This page faded out — pick the track back up below.
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={i === 0 ? 'nf-link nf-link-primary' : 'nf-link'}
            >
              <span>{l.ja}</span>
              <span className="nf-link-en">{l.en}</span>
            </Link>
          ))}
        </nav>
      </div>

      <style>{`
        .nf-link {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 10px;
          padding: 14px 24px;
          border-radius: 9999px;
          border: 1px solid rgba(240,237,230,0.18);
          color: #f0ede6;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          transition: background var(--t-ui, 0.12s) var(--t-ui-ease, ease),
                      border-color var(--t-ui, 0.12s) var(--t-ui-ease, ease),
                      color var(--t-ui, 0.12s) var(--t-ui-ease, ease);
        }
        .nf-link:hover { background: rgba(240,237,230,0.08); border-color: rgba(240,237,230,0.38); }
        .nf-link-primary { background: #c4956a; border-color: #c4956a; color: #fff; }
        .nf-link-primary:hover { background: #b8845e; border-color: #b8845e; }
        .nf-link-en { font-size: 12px; font-weight: 400; opacity: 0.6; }
        @media (max-width: 480px) {
          .nf-link { flex-direction: column; gap: 2px; align-items: center; }
        }
      `}</style>
    </main>
  );
}
