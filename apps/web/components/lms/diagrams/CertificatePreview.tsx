'use client';

const DISCIPLINE_COLORS: Record<string, string> = {
  WRT: '#2490ed',
  CRT: '#26c4a0',
  ASD: '#6c63ff',
  OCT: '#9b59b6',
  CCT: '#17b8d4',
  FSRT: '#f05a35',
  AMRT: '#27ae60',
};

interface CertificatePreviewProps {
  studentName?: string;
  courseName?: string;
  discipline?: string;
  completedDate?: string;
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
}: CertificatePreviewProps) {
  const discColor = DISCIPLINE_COLORS[discipline] ?? '#2490ed';

  return (
    <div
      className="relative mx-auto max-w-xl select-none"
      role="img"
      aria-label={`Certificate of Completion for ${studentName} — ${courseName}`}
    >
      {/* Outer decorative border */}
      <div
        className="rounded-sm p-1"
        style={{
          background: `linear-gradient(135deg, ${discColor}40 0%, ${discColor}15 50%, ${discColor}40 100%)`,
        }}
      >
        {/* Inner certificate card */}
        <div
          className="relative rounded-sm bg-[#fefdf8] p-8 text-center"
          style={{
            border: `2px solid ${discColor}50`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          {/* Corner decorations */}
          <div
            className="absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2"
            style={{ borderColor: discColor }}
          />
          <div
            className="absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2"
            style={{ borderColor: discColor }}
          />
          <div
            className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2"
            style={{ borderColor: discColor }}
          />
          <div
            className="absolute right-3 bottom-3 h-6 w-6 border-r-2 border-b-2"
            style={{ borderColor: discColor }}
          />

          {/* CARSI Logo mark */}
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-sm text-lg font-bold text-white"
              style={{ backgroundColor: '#2490ed' }}
            >
              C
            </div>
            <span className="text-sm font-semibold tracking-[0.25em] text-[#1a1a1a] uppercase">
              CARSI
            </span>
          </div>

          {/* Heading */}
          <h2
            className="mb-1 text-2xl font-light tracking-wide text-[#1a1a1a]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Certificate of Completion
          </h2>
          <div className="mx-auto mb-6 h-px w-32" style={{ backgroundColor: discColor }} />

          {/* Certification text */}
          <p className="mb-2 text-xs tracking-wide text-[#666] uppercase">This certifies that</p>
          <p
            className="mb-2 text-xl text-[#1a1a1a]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
          >
            {studentName}
          </p>
          <p className="mb-1 text-xs tracking-wide text-[#666] uppercase">
            has successfully completed
          </p>
          <p
            className="mb-5 text-base font-semibold text-[#1a1a1a]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {courseName}
          </p>

          {/* Discipline badge */}
          <div className="mx-auto mb-5 flex items-center justify-center gap-2">
            <span
              className="inline-flex items-center rounded-sm px-3 py-1 text-xs font-bold tracking-wider text-white uppercase"
              style={{ backgroundColor: discColor }}
            >
              {discipline}
            </span>
            <span className="text-xs text-[#888]">Discipline</span>
          </div>

          {/* Date + IICRC stamp */}
          <div className="mx-auto mb-6 flex items-center justify-center gap-6">
            <p className="text-xs text-[#666]">{completedDate}</p>
            <div
              className="rounded-sm border px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
              style={{
                borderColor: `${discColor}60`,
                color: discColor,
              }}
            >
              IICRC CEC Approved
            </div>
          </div>

          {/* Signature lines */}
          <div className="mx-auto flex max-w-sm justify-between gap-8">
            <div className="flex-1 text-center">
              <div className="mb-1 border-b border-[#ccc]" />
              <p className="text-[10px] tracking-wide text-[#888] uppercase">Course Instructor</p>
            </div>
            <div className="flex-1 text-center">
              <div className="mb-1 border-b border-[#ccc]" />
              <p className="text-[10px] tracking-wide text-[#888] uppercase">
                CARSI Training Director
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
