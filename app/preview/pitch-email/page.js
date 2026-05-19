import { pitchEmailHtml, stripUrlsFromPitchBody } from '@/app/api/email/route';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PreviewPitchEmail() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const dummyPitchBodyWithUrls = `I'd really love for you to give "Japan" a listen — it's a track we're genuinely proud of, and I think it'll resonate with you.

ROUTE14band is a Tokyo-based instrumental jazz-pop band founded in 2010 by trumpeter Chihiro Yamazaki, built around a signature concept of instruments that sing. Since 2013, they've appeared at SXSW ten times, performed at the NZ Bay of Islands Jazz Festival eight times (2017–2025), and collaborated internationally with artists including Bill Cantos and MINMI.

"Japan" sits right in the pocket — a groove-driven, mid-tempo instrumental that pulses with energy and excitement without ever losing its melodic warmth.

Please give it a listen — it would mean a lot.

Stream: https://open.spotify.com/intl-ja/track/0nRk8b3ULAQA6QzRvTOLmm
Spotify: https://open.spotify.com/intl-ja/artist/7b7UbINKyRM9cq1Au8kRK3
YouTube (10,200 subscribers): https://www.youtube.com/@CYR14`;

  const html = pitchEmailHtml({
    artistName: 'ROUTE14band',
    trackTitle: 'Japan',
    foundingNumber: 8,
    curatorName: 'Satoshi',
    pitchBody: stripUrlsFromPitchBody(dummyPitchBodyWithUrls),
    artistBio: 'ROUTE14band is a Japanese instrumental jazz-pop band founded in 2010 by trumpeter Chihiro Yamazaki, pursuing a signature sound philosophy of "instruments that sing." The band has appeared at SXSW ten times since 2013 and performed at the NZ Bay of Islands Jazz Festival eight consecutive times (2017–2025), alongside appearances at the Chilpo Jazz Festival in Korea and Austin public television.',
    artistSocials: {
      spotify: 'https://open.spotify.com/intl-ja/artist/7b7UbINKyRM9cq1Au8kRK3',
      youtube: 'https://www.youtube.com/@CYR14',
      instagram: 'https://www.instagram.com/route14band/',
      x: 'https://x.com/CY_ROUTE14',
    },
    artistEmail: 'soulbingo2000@yahoo.co.jp',
    respondUrl: 'https://otonami.io/curator/pitch/preview-test',
  });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
