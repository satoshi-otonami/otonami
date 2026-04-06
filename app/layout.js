import './globals.css';

export const metadata = {
  title: 'OTONAMI — Connect Japanese Music to the World',
  description: 'AI-powered pitch platform connecting Japanese indie artists with international curators, playlist makers, and music blogs.',
  openGraph: {
    title: 'OTONAMI — Connect Japanese Music to the World',
    description: 'AI-powered pitch platform connecting Japanese independent artists with international curators, playlist editors, and music bloggers.',
    url: 'https://otonami.io',
    siteName: 'OTONAMI',
    images: [
      {
        url: 'https://otonami.io/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OTONAMI — Connect Japanese Music to the World',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OTONAMI — Connect Japanese Music to the World',
    description: 'AI-powered pitch platform for Japanese independent music.',
    images: ['https://otonami.io/images/og-image.jpg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300..600;1,9..40,300..400&family=Sora:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
