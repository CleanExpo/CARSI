import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'CARSI — Professional Restoration Training';
export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: '#0a0f1a',
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(36,144,237,0.15) 0%, transparent 50%)',
        padding: '50px 70px',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2490ed 0%, #38a8ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '14px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          C
        </div>
        <span
          style={{
            fontSize: '28px',
            fontWeight: '600',
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '-0.02em',
          }}
        >
          CARSI
        </span>
      </div>

      {/* Headline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '24px',
        }}
      >
        <span
          style={{
            fontSize: '52px',
            fontWeight: 'bold',
            color: 'rgba(255,255,255,0.95)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          }}
        >
          Industry-leading training.
        </span>
        <span
          style={{
            fontSize: '52px',
            fontWeight: 'bold',
            color: '#2490ed',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          }}
        >
          Available 24/7.
        </span>
      </div>

      {/* Subheadline */}
      <p
        style={{
          fontSize: '20px',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '36px',
          maxWidth: '650px',
          lineHeight: 1.4,
        }}
      >
        IICRC-approved CEC training for restoration professionals across Australia.
      </p>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: '40px',
        }}
      >
        {[
          { value: '91+', label: 'Courses' },
          { value: '7', label: 'Disciplines' },
          { value: '12+', label: 'Industries' },
        ].map((stat) => (
          <div key={stat.label} style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#2490ed',
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #2490ed 0%, #ed9d24 100%)',
        }}
      />
    </div>,
    {
      ...size,
    }
  );
}
