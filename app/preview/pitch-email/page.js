import { pitchEmailHtml, stripUrlsFromPitchBody } from '@/app/api/email/route';
import { buildPersonalLine } from '@/lib/pitch-personalization';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Track genres in the shape pitches.artist_genre actually stores them:
// a comma-separated TEXT string, not an array.
const TRACK_GENRES = 'Pop, J-Pop, City Pop, Indie, Funk';

// One case per branch of buildPersonalLine, using curator shapes that exist in
// production today (Leap / Huamangazo / Forthright Records / Akuma Records).
const VARIANTS = {
  playlist: {
    label: 'playlist — genres overlap the track',
    curator: { name: 'Leap', type: 'playlist', genres: ['City Pop', 'J-Pop', 'Alternative', 'Rock'] },
  },
  radio: {
    label: 'radio — genres, no overlap with the track',
    curator: { name: 'Huamangazo', type: 'radio', genres: ['Experimental', 'Jazz fusion'] },
  },
  sync: {
    label: 'sync — genres overlap',
    curator: { name: 'Sync Supervisor', type: 'sync', genres: ['Funk', 'Instrumental'] },
  },
  nogenres: {
    label: 'no genre information — type-only fallback',
    curator: { name: 'Forthright Records', type: 'sync', genres: [], accepts: [] },
  },
  notype: {
    label: 'no type — no line inserted at all',
    curator: { name: 'Akuma Records', type: null, genres: [] },
  },
};

const dummyPitchBodyWithUrls = `I'd really love for you to give "Japan" a listen — it's a track we're genuinely proud of, and I think it'll resonate with you.

ROUTE14band is a Tokyo-based instrumental jazz-pop band founded in 2010 by trumpeter Chihiro Yamazaki, built around a signature concept of instruments that sing. Since 2013, they've appeared at SXSW ten times, performed at the NZ Bay of Islands Jazz Festival eight times (2017–2025), and collaborated internationally with artists including Bill Cantos and MINMI.

"Japan" sits right in the pocket — a groove-driven, mid-tempo instrumental that pulses with energy and excitement without ever losing its melodic warmth.

Please give it a listen — it would mean a lot.

Stream: https://open.spotify.com/intl-ja/track/0nRk8b3ULAQA6QzRvTOLmm
Spotify: https://open.spotify.com/intl-ja/artist/7b7UbINKyRM9cq1Au8kRK3
YouTube (10,200 subscribers): https://www.youtube.com/@CYR14`;

export default async function PreviewPitchEmail({ searchParams }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const params = await searchParams;
  const key = VARIANTS[params?.variant] ? params.variant : 'playlist';
  const { curator } = VARIANTS[key];
  const personalLine = buildPersonalLine(curator, null, TRACK_GENRES);

  const html = pitchEmailHtml({
    artistName: 'ROUTE14band',
    trackTitle: 'Japan',
    foundingNumber: 8,
    curatorName: curator.name,
    pitchBody: stripUrlsFromPitchBody(dummyPitchBodyWithUrls),
    personalLine,
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

  return (
    <div>
      <div style={{ padding: 12, background: '#111', color: '#eee', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
        <div style={{ marginBottom: 6 }}>
          {Object.entries(VARIANTS).map(([k, v]) => (
            <a
              key={k}
              href={`?variant=${k}`}
              style={{
                marginRight: 10,
                padding: '3px 8px',
                borderRadius: 4,
                textDecoration: 'none',
                background: k === key ? '#c4956a' : '#333',
                color: k === key ? '#111' : '#ccc',
              }}
            >
              {k}
            </a>
          ))}
        </div>
        <div>{VARIANTS[key].label}</div>
        <div style={{ color: '#c4956a' }}>
          curator.type={String(curator.type)} · genres=[{(curator.genres || []).join(', ')}] · track=[{TRACK_GENRES}]
        </div>
        <div style={{ color: personalLine ? '#8fd18f' : '#e08b8b' }}>
          → {personalLine ? `"${personalLine}" (${personalLine.length} chars)` : '(no line inserted)'}
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
