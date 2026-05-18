'use client';

import Image from 'next/image';

import { formatCredentialRef } from '@/lib/credential-format';
import { IICRC_DISCIPLINE_LONG } from '@/lib/iicrc-discipline-display';

const DISCIPLINE_COLORS: Record<string, string> = {
  WRT: '#2490ed',
  CRT: '#26c4a0',
  ASD: '#6c63ff',
  OCT: '#9b59b6',
  CCT: '#17b8d4',
  FSRT: '#f05a35',
  AMRT: '#27ae60',
};

export interface CertificatePreviewProps {
  studentName?: string;
  courseName?: string;
  discipline?: string;
  completedDate?: string;
  issuedDate?: string;
  credentialId?: string;
  cecHours?: number | null;
  durationHours?: number | null;
  courseLevel?: string | null;
  verificationUrl?: string;
}

function disciplineCode(raw?: string): string {
  const c = raw?.trim().toUpperCase();
  if (!c || c === '—' || c === '-') return 'GEN';
  return c;
}

export function CertificatePreview({
  studentName = 'James Wilson',
  courseName = 'Water Damage Restoration Technician',
  discipline = 'WRT',
  completedDate = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  issuedDate,
  credentialId,
  cecHours = 4,
  durationHours = 6,
  courseLevel = 'Professional development',
  verificationUrl = 'https://carsi.com.au/verify/credential/example',
}: CertificatePreviewProps) {
  const discCode = disciplineCode(discipline);
  const discColor = DISCIPLINE_COLORS[discCode] ?? '#2490ed';
  const discLabel = IICRC_DISCIPLINE_LONG[discCode] ?? discipline;
  const issued = issuedDate ?? completedDate;
  const credentialRef = credentialId ? formatCredentialRef(credentialId) : 'CARSI-EXAMPLE000';
  const cecLabel =
    cecHours != null && cecHours > 0
      ? `${cecHours % 1 === 0 ? cecHours : cecHours.toFixed(1)} IICRC CEC hour${cecHours === 1 ? '' : 's'}`
      : 'As listed in course accreditation record';
  const durationLabel =
    durationHours != null && durationHours > 0
      ? `${durationHours % 1 === 0 ? durationHours : durationHours.toFixed(1)} hours · Online LMS`
      : 'Online · CARSI Learning Platform';

  const details: { label: string; value: string }[] = [
    { label: 'Programme', value: courseName },
    { label: 'Date of completion', value: completedDate },
    { label: 'Credential reference', value: credentialRef },
    { label: 'IICRC discipline', value: `${discCode} — ${discLabel}` },
    { label: 'Continuing education', value: cecLabel },
    {
      label: 'Delivery & duration',
      value: `${durationLabel} · ${courseLevel ?? 'Professional development'}`,
    },
    { label: 'Issuing organisation', value: 'CARSI Learning · IICRC-aligned curriculum' },
  ];

  return (
    <div
      className="relative mx-auto w-full max-w-2xl select-none"
      role="img"
      aria-label={`Certificate of Completion for ${studentName} — ${courseName}`}
    >
      <div
        className="rounded-sm p-[3px]"
        style={{
          background: `linear-gradient(135deg, ${discColor}40 0%, ${discColor}15 50%, ${discColor}35 100%)`,
        }}
      >
        <div
          className="relative rounded-sm bg-[#0a0e14] px-6 py-8 text-center sm:px-10 sm:py-10"
          style={{
            border: `1.5px solid ${discColor}66`,
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="absolute top-4 left-4 h-5 w-5 border-t-2 border-l-2"
            style={{ borderColor: discColor }}
            aria-hidden
          />
          <div
            className="absolute top-4 right-4 h-5 w-5 border-t-2 border-r-2"
            style={{ borderColor: discColor }}
            aria-hidden
          />
          <div
            className="absolute bottom-4 left-4 h-5 w-5 border-b-2 border-l-2"
            style={{ borderColor: discColor }}
            aria-hidden
          />
          <div
            className="absolute right-4 bottom-4 h-5 w-5 border-r-2 border-b-2"
            style={{ borderColor: discColor }}
            aria-hidden
          />

          <div className="mx-auto mb-3 flex justify-center">
            <Image
              src="/logo/logo1.png"
              alt=""
              width={168}
              height={48}
              className="h-11 w-auto max-w-[168px] object-contain"
              priority
              aria-hidden
            />
          </div>
          <p className="mb-4 text-[10px] tracking-wide text-white/40">
            Centre for Applied Restoration Science &amp; Industry
          </p>

          <h2
            className="mb-1 text-2xl font-light tracking-wide text-white/95 sm:text-[1.65rem]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Certificate of Completion
          </h2>
          <p className="mb-3 text-[11px] text-white/45">Official record of achievement</p>
          <div className="mx-auto mb-6 h-px w-28" style={{ backgroundColor: discColor }} />

          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-white/45 uppercase">
            This is to certify that
          </p>
          <p
            className="mb-3 text-xl text-[#7ec5ff] sm:text-2xl"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
          >
            {studentName}
          </p>
          <p className="mx-auto mb-1 max-w-md text-xs leading-relaxed text-white/50">
            has demonstrated the required competency and
            <br />
            successfully completed the accredited programme
          </p>
          <p
            className="mx-auto mt-3 mb-6 max-w-lg text-base font-semibold text-white/92 sm:text-lg"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {courseName}
          </p>

          <div
            className="mx-auto mb-5 max-w-lg rounded-sm border text-left text-sm"
            style={{ borderColor: `${discColor}55`, backgroundColor: 'rgba(14,18,26,0.95)' }}
          >
            <dl className="divide-y divide-white/[0.06]">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[38%_1fr] gap-3 px-4 py-2.5 sm:px-5"
                >
                  <dt className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">
                    {row.label}
                  </dt>
                  <dd className="text-xs leading-snug text-white/88">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p
            className="mx-auto mb-6 max-w-lg rounded-sm px-4 py-2.5 text-[11px] leading-relaxed text-white/60"
            style={{ backgroundColor: `${discColor}22` }}
          >
            This programme is designed for IICRC Continuing Education Credits (CECs) where
            applicable. Maintain this certificate with your renewal records.
          </p>

          <div className="mx-auto grid max-w-lg grid-cols-3 gap-4 border-t border-white/[0.08] pt-6 text-center">
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">
                Date issued
              </p>
              <p className="mt-1 text-xs text-white/75">{issued}</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-center"
                style={{ borderColor: `${discColor}88` }}
              >
                <span className="block text-[9px] font-bold tracking-wider" style={{ color: discColor }}>
                  CARSI
                  <br />
                  <span className="text-[7px] font-normal text-white/45">VERIFIED</span>
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">
                Authorised signatory
              </p>
              <p
                className="mt-1 text-lg text-white/85"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
              >
                Philip McGurk
              </p>
              <div className="mx-auto mt-1 mb-1 h-px w-24 bg-white/20" />
              <p className="text-[10px] tracking-wide text-white/40 uppercase">Training Director</p>
            </div>
          </div>

          {verificationUrl ? (
            <p className="mt-6 text-[10px] text-white/45">
              <span className="font-semibold text-white/55">Verify this credential:</span>
              <br />
              <span className="break-all" style={{ color: discColor }}>
                {verificationUrl}
              </span>
            </p>
          ) : null}

          <p className="mt-4 text-[10px] text-white/30">carsi.com.au · Restoration industry education</p>
        </div>
      </div>
    </div>
  );
}
