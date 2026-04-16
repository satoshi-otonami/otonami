import Link from 'next/link';

export default function LegalPageLayout({ title, subtitle, lastUpdated, children }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#faf8f5',
        padding: '80px 20px 120px',
        fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#1a1a2e',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .legal-content h2 {
          font-family: 'Sora', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 36px 0 16px 0;
          padding-bottom: 10px;
          border-bottom: 1px solid #f0ece6;
          letter-spacing: -0.01em;
        }
        .legal-content h2:first-child {
          margin-top: 0;
        }
        .legal-content h3 {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 24px 0 10px 0;
        }
        .legal-content p {
          margin: 12px 0;
        }
        .legal-content ul,
        .legal-content ol {
          margin: 12px 0 12px 8px;
          padding-left: 20px;
        }
        .legal-content li {
          margin: 6px 0;
        }
        .legal-content strong {
          color: #1a1a2e;
          font-weight: 600;
        }
        .legal-content a {
          color: #FF6B4A;
          text-decoration: none;
          font-weight: 500;
        }
        .legal-content a:hover {
          text-decoration: underline;
        }
        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 13.5px;
        }
        .legal-content th,
        .legal-content td {
          text-align: left;
          padding: 12px 14px;
          border-bottom: 1px solid #f0ece6;
          vertical-align: top;
        }
        .legal-content th {
          font-family: 'Sora', sans-serif;
          font-weight: 600;
          background: #faf8f5;
          color: #1a1a2e;
        }
        @media (max-width: 640px) {
          .legal-content {
            padding: 28px 22px !important;
          }
        }
      `}} />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            color: '#6b6560',
            textDecoration: 'none',
            marginBottom: 32,
          }}
        >
          ← ホームに戻る
        </Link>

        <header style={{ marginBottom: 48 }}>
          <div
            style={{
              width: 40,
              height: 3,
              background: '#c4956a',
              marginBottom: 20,
            }}
          />
          <h1
            style={{
              fontFamily: '"Sora", sans-serif',
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 1.25,
              margin: 0,
              marginBottom: 12,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 15, color: '#6b6560', margin: 0, lineHeight: 1.6 }}>
              {subtitle}
            </p>
          )}
        </header>

        <article
          style={{
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 2px 12px rgba(26, 26, 46, 0.06)',
            padding: '40px 44px',
            fontSize: 14.5,
            lineHeight: 1.85,
            color: '#3a3a4a',
          }}
          className="legal-content"
        >
          {children}
        </article>

        <div
          style={{
            marginTop: 32,
            padding: '20px 24px',
            background: '#ffffff',
            border: '1px solid #f0ece6',
            borderRadius: 12,
            fontSize: 13,
            color: '#6b6560',
            lineHeight: 1.7,
          }}
        >
          <p style={{ margin: 0 }}>
            本記載内容に関するお問い合わせは、
            <a
              href="mailto:info@otonami.io"
              style={{ color: '#FF6B4A', textDecoration: 'none', fontWeight: 600 }}
            >
              info@otonami.io
            </a>
            {' '}までお願いいたします。
          </p>
          {lastUpdated && (
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#9a948e' }}>
              最終更新日：{lastUpdated}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
