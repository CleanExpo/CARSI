import {
  marketingBodySm,
  marketingEyebrowPill,
  marketingSectionTitle,
} from '@/lib/marketing/marketing-ui';

export function MarketingSectionHeader({
  eyebrow,
  title,
  body,
  eyebrowClassName = marketingEyebrowPill,
  align = 'left',
  className = '',
  pill = true,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  eyebrowClassName?: string;
  align?: 'left' | 'center';
  className?: string;
  /** When false, eyebrow renders as plain uppercase text (homepage “At a glance” style). */
  pill?: boolean;
}) {
  const alignClass = align === 'center' ? 'mx-auto text-center' : '';

  return (
    <div className={`mb-8 max-w-3xl md:mb-10 ${alignClass} ${className}`}>
      {pill ? (
        <p className={`mb-3 ${eyebrowClassName}`}>{eyebrow}</p>
      ) : (
        <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-[#146fc2]/90 uppercase dark:text-[#2490ed]/80">
          {eyebrow}
        </p>
      )}
      <h2 className={marketingSectionTitle}>{title}</h2>
      {pill ? (
        <div
          className={`mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#2490ed] via-[#5eb3ff] to-[#00d4aa] ${align === 'center' ? 'mx-auto' : ''}`}
          aria-hidden
        />
      ) : null}
      {body ? <p className={`mt-3 ${marketingBodySm} sm:text-base`}>{body}</p> : null}
    </div>
  );
}
