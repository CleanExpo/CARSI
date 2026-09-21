import type { CSSProperties } from 'react';

import { formatCecHoursForCertificate } from '@/lib/cec-display';
import { formatCredentialRef } from '@/lib/credential-format';
import { IICRC_DISCIPLINE_LONG } from '@/lib/iicrc-discipline-display';

export const CERT_ART_WIDTH = 1684;
export const CERT_ART_HEIGHT = 1190;

export type CertificateArtInput = {
  studentName?: string;
  courseName?: string;
  discipline?: string;
  completedDate?: string;
  issuedDate?: string;
  credentialId?: string;
  cecHoursLabel?: number | null;
  courseLevel?: string | null;
};

const DISCIPLINE_COLORS: Record<string, string> = {
  WRT: '#2490ed',
  CRT: '#26c4a0',
  ASD: '#6c63ff',
  OCT: '#9b59b6',
  CCT: '#17b8d4',
  FSRT: '#f05a35',
  AMRT: '#27ae60',
};

function disciplineCode(raw?: string): string {
  const c = raw?.trim().toUpperCase();
  if (!c || c === '—' || c === '-') return 'GEN';
  const match = c.match(/\b(WRT|CRT|ASD|AMRT|FSRT|OCT|CCT)\b/);
  return match?.[1] ?? c.split('/')[0]?.trim() ?? 'GEN';
}

function Text({ style, children }: { style?: CSSProperties; children: string }) {
  return <div style={{ display: 'flex', ...style, whiteSpace: 'pre-wrap' }}>{children}</div>;
}

export function CertificateArt({ logoSrc, ...input }: CertificateArtInput & { logoSrc: string }) {
  const discCode = disciplineCode(input.discipline);
  const accent = DISCIPLINE_COLORS[discCode] ?? '#2490ed';
  const studentName = input.studentName ?? 'James Wilson';
  const courseName = input.courseName ?? 'Water Damage Restoration Technician';
  const completedDate = input.completedDate ?? '';
  const issuedDate = input.issuedDate ?? completedDate;
  const discLabel =
    discCode === 'GEN'
      ? 'General restoration training'
      : (IICRC_DISCIPLINE_LONG[discCode] ?? input.discipline ?? 'General restoration training');
  const credentialRef = input.credentialId
    ? formatCredentialRef(input.credentialId)
    : 'CARSI-EXAMPLE000';
  const cecValue = formatCecHoursForCertificate(input.cecHoursLabel);
  const courseLevel = input.courseLevel ?? 'Professional development';

  const details = [
    ['Discipline', discLabel, accent],
    ['Completed', completedDate, '#1e293b'],
    ...(cecValue ? ([['CEC credits', cecValue, '#1e293b']] as const) : []),
    ['Programme level', courseLevel, '#1e293b'],
  ] as const;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#eaf4fc',
        color: '#0f172a',
      }}
    >
      <div
        style={{
          margin: 20,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: `2px solid ${accent}99`,
          position: 'relative',
        }}
      >
        {(
          [
            {
              top: 16,
              left: 16,
              borderTop: `3px solid ${accent}`,
              borderLeft: `3px solid ${accent}`,
            },
            {
              top: 16,
              right: 16,
              borderTop: `3px solid ${accent}`,
              borderRight: `3px solid ${accent}`,
            },
            {
              bottom: 16,
              left: 16,
              borderBottom: `3px solid ${accent}`,
              borderLeft: `3px solid ${accent}`,
            },
            {
              bottom: 16,
              right: 16,
              borderBottom: `3px solid ${accent}`,
              borderRight: `3px solid ${accent}`,
            },
          ] as const
        ).map((box, i) => (
          <div
            key={i}
            style={{ position: 'absolute', width: 22, height: 22, display: 'flex', ...box }}
          />
        ))}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '28px 80px 12px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={280} height={130} alt="" style={{ objectFit: 'contain' }} />
          <Text style={{ fontSize: 20, color: '#64748b', marginTop: 10 }}>
            Centre for Applied Restoration Science & Industry
          </Text>
          <Text style={{ fontSize: 48, color: '#020617', marginTop: 14 }}>
            Certificate of Completion
          </Text>
          <Text style={{ fontSize: 20, color: '#64748b', marginTop: 6 }}>
            Official record of achievement
          </Text>
          <div
            style={{
              width: 96,
              height: 2,
              backgroundColor: accent,
              marginTop: 16,
              display: 'flex',
            }}
          />
          <Text style={{ fontSize: 18, color: '#64748b', marginTop: 16 }}>
            This is to certify that
          </Text>
          <Text style={{ fontSize: 52, color: '#146fc2', marginTop: 4 }}>{studentName}</Text>
          <Text style={{ fontSize: 22, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
            has demonstrated the required competency and successfully completed the accredited
            programme
          </Text>
          <Text style={{ fontSize: 30, color: '#020617', marginTop: 10, textAlign: 'center' }}>
            {courseName}
          </Text>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderTop: '1px solid #cbd5e1',
            margin: '8px 80px 0',
            paddingTop: 16,
          }}
        >
          <Text style={{ fontSize: 16, color: '#64748b' }}>Programme details</Text>
          <div style={{ display: 'flex', width: '100%', marginTop: 12 }}>
            {details.map(([label, value, color]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <Text style={{ fontSize: 16, color: '#64748b' }}>{label}</Text>
                <Text style={{ fontSize: 22, color, marginTop: 4 }}>{value}</Text>
              </div>
            ))}
          </div>
          <Text style={{ fontSize: 20, color: '#475569', marginTop: 12 }}>
            {`Credential ${credentialRef}`}
          </Text>
          <Text style={{ fontSize: 18, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
            Designed for IICRC Continuing Education Credits (CECs) where applicable. Retain this
            certificate with your renewal records.
          </Text>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            margin: '20px 80px 8px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: 380 }}>
            <Text style={{ fontSize: 16, color: '#64748b' }}>Date issued</Text>
            <Text style={{ fontSize: 22, color: '#1e293b', marginTop: 4 }}>{issuedDate}</Text>
            <Text style={{ fontSize: 16, color: '#64748b', marginTop: 4 }}>CARSI Learning</Text>
          </div>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 88,
              border: `3px solid ${accent}`,
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: accent }}>CARSI</Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>VERIFIED</Text>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              width: 380,
            }}
          >
            <Text style={{ fontSize: 16, color: '#64748b' }}>Authorised signatory</Text>
            <Text style={{ fontSize: 26, color: '#1e293b', marginTop: 4 }}>Philip McGurk</Text>
            <Text style={{ fontSize: 16, color: '#64748b', marginTop: 6 }}>Training Director</Text>
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: '1px solid #cbd5e1',
            padding: '14px 24px',
          }}
        >
          <Text style={{ fontSize: 18, color: '#64748b' }}>
            IICRC CEC Accredited · carsi.com.au
          </Text>
        </div>
      </div>
    </div>
  );
}
