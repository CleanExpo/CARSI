'use client';

import Image from 'next/image';

import { formatCecHoursForCertificate } from '@/lib/cec-display';
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
  courseLevel?: string | null;
}

function disciplineCode(raw?: string): string {
  const c = raw?.trim().toUpperCase();
  if (!c || c === '—' || c === '-') return 'GEN';
  const match = c.match(/\b(WRT|CRT|ASD|AMRT|FSRT|OCT|CCT)\b/);
  return match?.[1] ?? c.split('/')[0]?.trim() ?? 'GEN';
}

function ProgrammeDetail({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex min-w-[5.5rem] flex-col items-center px-3 text-center sm:min-w-[6.5rem] sm:px-4">
      <span className="text-[8px] font-medium tracking-[0.14em] text-white/38 uppercase sm:text-[9px]">
        {label}
      </span>
      <span
        className="mt-1.5 text-[10px] font-medium leading-snug text-white/88 sm:text-[11px]"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
    </div>
  );
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
  courseLevel = 'Professional development',
}: CertificatePreviewProps) {
  const discCode = disciplineCode(discipline);
  const discColor = DISCIPLINE_COLORS[discCode] ?? '#2490ed';
  const discLabel =
    discCode === 'GEN'
      ? 'General restoration training'
      : (IICRC_DISCIPLINE_LONG[discCode] ?? discipline);
  const issued = issuedDate ?? completedDate;
  const credentialRef = credentialId ? formatCredentialRef(credentialId) : 'CARSI-EXAMPLE000';
  const cecValue = formatCecHoursForCertificate(cecHours);

  return (
    <div
      className="relative mx-auto w-full max-w-6xl select-none"
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
          className="relative flex flex-col overflow-hidden rounded-sm bg-[#0a0e14] text-center"
          style={{
            border: `1.5px solid ${discColor}66`,
            boxShadow: '0 16px 56px rgba(0,0,0,0.4)',
            aspectRatio: '842 / 595',
          }}
        >
          {/* Corner brackets */}
          <div
            className="absolute top-3 left-3 h-4 w-4 border-t-2 border-l-2 sm:top-4 sm:left-4 sm:h-5 sm:w-5"
            style={{ borderColor: discColor }}
            aria-hidden
          />
          <div
            className="absolute top-3 right-3 h-4 w-4 border-t-2 border-r-2 sm:top-4 sm:right-4 sm:h-5 sm:w-5"
            style={{ borderColor: discColor }}
            aria-hidden
          />
          <div
            className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 sm:bottom-4 sm:left-4 sm:h-5 sm:w-5"
            style={{ borderColor: discColor }}
            aria-hidden
          />
          <div
            className="absolute right-3 bottom-3 h-4 w-4 border-r-2 border-b-2 sm:right-4 sm:bottom-4 sm:h-5 sm:w-5"
            style={{ borderColor: discColor }}
            aria-hidden
          />

          {/* Main award body */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 pt-5 pb-3 sm:px-10 sm:pt-6">
            <Image
              src="/logo/logo1.png"
              alt=""
              width={198}
              height={92}
              className="mb-2 h-[92px] w-auto max-w-[198px] object-contain sm:h-[96px] sm:max-w-[208px]"
              priority
              aria-hidden
            />
            <p className="mb-4 text-[9px] tracking-[0.04em] text-white/38 sm:text-[10px]">
              Centre for Applied Restoration Science &amp; Industry
            </p>

            <h2
              className="text-[1.35rem] font-light tracking-[0.02em] text-white/96 sm:text-[1.65rem]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Certificate of Completion
            </h2>
            <p className="mt-1 text-[10px] text-white/42">Official record of achievement</p>
            <div
              className="my-4 h-px w-20 sm:my-5 sm:w-24"
              style={{ backgroundColor: `${discColor}cc` }}
            />

            <p className="mb-2 text-[9px] font-semibold tracking-[0.16em] text-white/42 uppercase sm:text-[10px]">
              This is to certify that
            </p>
            <p
              className="mb-3 max-w-2xl text-[1.45rem] leading-tight text-[#8fd0ff] sm:mb-4 sm:text-[1.75rem]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
            >
              {studentName}
            </p>
            <p className="mb-3 max-w-lg text-[11px] leading-relaxed text-white/48 sm:text-xs">
              has demonstrated the required competency and successfully completed the accredited
              programme
            </p>
            <p
              className="max-w-2xl text-sm font-semibold leading-snug text-white/93 sm:text-base"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {courseName}
            </p>
          </div>

          {/* Programme details — integrated metadata band */}
          <div
            className="mx-6 border-t sm:mx-10"
            style={{ borderColor: `${discColor}33` }}
          >
            <div className="py-4 sm:py-5">
              <p className="mb-3 text-[8px] font-semibold tracking-[0.2em] text-white/35 uppercase sm:text-[9px]">
                Programme details
              </p>
              <div className="flex flex-wrap items-start justify-center divide-x divide-white/10">
                <ProgrammeDetail label="Discipline" value={discLabel} accent={discColor} />
                <ProgrammeDetail label="Completed" value={completedDate ?? '—'} />
                {cecValue ? <ProgrammeDetail label="CEC credits" value={cecValue} /> : null}
                <ProgrammeDetail
                  label="Programme level"
                  value={courseLevel ?? 'Professional development'}
                />
              </div>
              <p className="mt-3 font-mono text-[9px] tracking-wide text-white/38 sm:text-[10px]">
                Credential {credentialRef}
              </p>
              <p className="mx-auto mt-3 max-w-xl text-[9px] leading-relaxed text-white/42 italic sm:text-[10px]">
                Designed for IICRC Continuing Education Credits (CECs) where applicable. Retain this
                certificate with your renewal records.
              </p>
            </div>
          </div>

          {/* Official footer band */}
          <div
            className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-end gap-2 border-t px-6 py-4 sm:gap-4 sm:px-10 sm:py-5"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <div className="text-left">
              <p className="text-[8px] font-semibold tracking-[0.14em] text-white/38 uppercase sm:text-[9px]">
                Date issued
              </p>
              <p className="mt-1 text-[10px] text-white/72 sm:text-[11px]">{issued}</p>
              <p className="mt-2 text-[8px] text-white/28 sm:text-[9px]">CARSI Learning</p>
            </div>

            <div className="flex flex-col items-center px-2">
              <div
                className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 bg-[#0a0e14] sm:h-[60px] sm:w-[60px]"
                style={{ borderColor: `${discColor}88` }}
              >
                <div
                  className="absolute inset-[5px] rounded-full border"
                  style={{ borderColor: `${discColor}40` }}
                  aria-hidden
                />
                <div className="relative text-center leading-tight">
                  <span
                    className="block text-[9px] font-extrabold tracking-[0.14em] sm:text-[10px]"
                    style={{ color: discColor }}
                  >
                    CARSI
                  </span>
                  <span className="block text-[6px] font-bold tracking-[0.16em] text-white/78 sm:text-[7px]">
                    VERIFIED
                  </span>
                  <span className="block text-[5px] tracking-[0.1em] text-white/40 uppercase sm:text-[6px]">
                    Completion
                  </span>
                </div>
              </div>
              <p className="mt-2 max-w-[9rem] text-center text-[7px] leading-snug text-white/30 sm:text-[8px]">
                IICRC CEC Accredited · carsi.com.au
              </p>
            </div>

            <div className="text-right">
              <p className="text-[8px] font-semibold tracking-[0.14em] text-white/38 uppercase sm:text-[9px]">
                Authorised signatory
              </p>
              <div className="mt-2 inline-block text-right">
                <p
                  className="text-base text-white/88 sm:text-lg"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontStyle: 'italic',
                  }}
                >
                  Philip McGurk
                </p>
                <div className="ml-auto mt-1 h-px w-24 bg-white/18" />
                <p className="mt-1 text-[8px] tracking-[0.08em] text-white/38 uppercase sm:text-[9px]">
                  Training Director
                </p>
                <p className="mt-0.5 text-[8px] text-white/28 sm:text-[9px]">
                  Centre for Applied Restoration Science &amp; Industry
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
