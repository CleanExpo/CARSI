'use client';

import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

interface IICRCCertification {
  discipline: string;
  certified_at: string; // ISO date
}

interface IICRCIdentityCardProps {
  memberNumber?: string | null;
  cardImageUrl?: string | null;
  expiryDate?: string | null;
  certifications?: IICRCCertification[];
  onEdit?: () => void;
}

function _formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function IICRCIdentityCard({
  memberNumber,
  cardImageUrl,
  expiryDate,
  certifications = [],
  onEdit,
}: IICRCIdentityCardProps) {
  if (!memberNumber) {
    return (
      <div className="flex flex-col gap-3 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-6">
        <p className="text-sm text-white/50">
          No <AcronymTooltip term="IICRC" /> membership linked. Add your{' '}
          <AcronymTooltip term="IICRC" /> member number to track your <AcronymTooltip term="CEC" />{' '}
          credits and renewal status.
        </p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-left text-sm text-cyan-400 underline transition-colors hover:text-cyan-300"
          >
            + Add <AcronymTooltip term="IICRC" /> member number
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
            <AcronymTooltip term="IICRC" /> Member
          </p>
          <p className="font-mono text-2xl font-bold text-white">{memberNumber}</p>
          {expiryDate && (
            <p className="text-xs text-white/40">
              Renewal due: <span className="text-white/70">{_formatDate(expiryDate)}</span>
            </p>
          )}
        </div>

        {cardImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cardImageUrl}
            alt="IICRC member card"
            className="h-16 rounded-sm border border-white/[0.08] object-cover"
          />
        )}
      </div>

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
            Certifications
          </p>
          <div className="flex flex-wrap gap-2">
            {certifications.map((cert) => (
              <div
                key={cert.discipline}
                className="flex flex-col items-center rounded-sm border border-white/[0.06] bg-zinc-800 px-3 py-2"
              >
                <span className="font-mono text-sm font-bold text-cyan-400">{cert.discipline}</span>
                <span className="text-xs text-white/30">{_formatDate(cert.certified_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {onEdit && (
        <button
          onClick={onEdit}
          className="text-left text-xs text-white/30 underline transition-colors hover:text-white/50"
        >
          Edit <AcronymTooltip term="IICRC" /> details
        </button>
      )}
    </div>
  );
}
