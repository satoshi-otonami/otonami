import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const COLORS = {
  bg: '#0A0A0A',
  coral: '#FF6B4A',
  pink: '#FF3D6E',
  purple: '#A78BFA',
};

const VARIANTS = {
  savedate: {
    label: 'Save the Date',
    main: '5.19',
    sub: 'OTONAMI Launches Tuesday',
    badge: '2026 / MAY / TUE',
  },
  countdown7: {
    label: '7 Days to Go',
    main: '5.19',
    sub: 'OTONAMI Launches in 1 Week',
    badge: '2026 / MAY / TUE',
  },
  countdown3: {
    label: '3 Days to Go',
    main: '5.19',
    sub: 'OTONAMI Launches Tuesday',
    badge: '2026 / MAY / TUE',
  },
  countdown1: {
    label: 'Tomorrow',
    main: '5.19',
    sub: 'OTONAMI Launches Tomorrow',
    badge: '2026 / MAY / TUE',
  },
  livenow: {
    label: 'Now Live',
    main: 'LIVE',
    sub: 'Welcome to OTONAMI',
    badge: 'PITCH NOW OPEN',
  },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const variantKey = searchParams.get('variant') || 'savedate';
  const variant = VARIANTS[variantKey] || VARIANTS.savedate;

  const [soraBold, dmSansBold, dmSansRegular] = await Promise.all([
    fetch(new URL('/fonts/Sora-ExtraBold.woff', request.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('/fonts/DMSans-Bold.woff', request.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('/fonts/DMSans-Regular.woff', request.url)).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          color: 'white',
          fontFamily: 'DM Sans',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -300,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 1500,
            height: 800,
            background:
              'radial-gradient(ellipse at center, rgba(255,107,74,0.55) 0%, rgba(255,107,74,0.2) 30%, transparent 60%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: -300,
            right: -100,
            width: 1300,
            height: 700,
            background:
              'radial-gradient(ellipse at center, rgba(255,61,110,0.45) 0%, rgba(255,61,110,0.15) 30%, transparent 60%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 90,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              border: '2.5px solid #FF6B4A',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
              padding: '0 6px',
            }}
          >
            {[14, 28, 20, 32, 16].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: h,
                  background: '#FF6B4A',
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: 'Sora',
              fontWeight: 800,
              fontSize: 36,
              letterSpacing: 2.16,
            }}
          >
            OTONAMI
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'DM Sans',
              fontWeight: 400,
              fontSize: 24,
              letterSpacing: 9.6,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              marginBottom: 28,
            }}
          >
            {variant.label}
          </div>

          <div
            style={{
              fontFamily: 'Sora',
              fontWeight: 800,
              fontSize: 280,
              letterSpacing: -16.8,
              lineHeight: 1,
              backgroundImage:
                'linear-gradient(135deg, #FF6B4A 0%, #FF3D6E 60%, #A78BFA 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {variant.main}
          </div>

          <div
            style={{
              fontFamily: 'DM Sans',
              fontWeight: 700,
              fontSize: 56,
              letterSpacing: -1.12,
              marginTop: 30,
              color: 'white',
            }}
          >
            {variant.sub}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 110,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,107,74,0.4)',
              borderRadius: 999,
              padding: '14px 32px',
              fontFamily: 'DM Sans',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4.5,
              textTransform: 'uppercase',
              color: '#FF6B4A',
              marginBottom: 28,
              display: 'flex',
            }}
          >
            {variant.badge}
          </div>
          <div
            style={{
              fontFamily: 'DM Sans',
              fontSize: 26,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: 1.3,
            }}
          >
            otonami.io
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'Sora', data: soraBold, weight: 800 },
        { name: 'DM Sans', data: dmSansBold, weight: 700 },
        { name: 'DM Sans', data: dmSansRegular, weight: 400 },
      ],
    }
  );
}
