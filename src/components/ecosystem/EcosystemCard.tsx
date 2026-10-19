import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';

import {
  ECOSYSTEM_PAGE_COPY,
  STATUS_LABEL,
  ecosystemHref,
  type EcosystemProduct,
  type EcosystemStatus,
} from '@/lib/ecosystem/products';

const STATUS_CLASS: Record<EcosystemStatus, string> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  preview: 'border-amber-200 bg-amber-50 text-amber-900',
  'in-development': 'border-slate-200 bg-slate-100 text-slate-700',
};

/**
 * One ecosystem product. Server component, static data: nothing loads after first paint except
 * the logo, which sits in a fixed-ratio box (the RestoreAssist logo's 480×402) so a real logo and
 * a placeholder tile are the same height and swapping one for the other cannot move the grid.
 * Placeholders are hidden from screen readers: the H2 beside them already names the product.
 */
export function EcosystemCard({ product }: { product: EcosystemProduct }) {
  const titleId = `ecosystem-${product.slug}-title`;
  const copy = ECOSYSTEM_PAGE_COPY;

  return (
    <article
      id={`ecosystem-${product.slug}`}
      aria-labelledby={titleId}
      data-testid="ecosystem-card"
      className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] sm:p-6"
    >
      <div className="relative aspect-[480/402] w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        {product.image ? (
          <Image
            src={product.image.src}
            width={product.image.width}
            height={product.image.height}
            alt={product.image.alt}
            loading="lazy"
            unoptimized
            className="h-full w-full object-contain p-6"
          />
        ) : (
          <div
            data-testid="ecosystem-placeholder"
            aria-hidden="true"
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 px-4 text-center"
          >
            <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-700">
              {product.name}
            </span>
            <span className="text-[11px] font-medium tracking-[0.18em] text-slate-600 uppercase">
              {copy.imageToCome}
            </span>
          </div>
        )}
      </div>

      <p className="mt-5">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[product.status]}`}
        >
          {STATUS_LABEL[product.status]}
        </span>
      </p>
      <h2
        id={titleId}
        className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.01em] text-slate-950"
      >
        {product.name}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{product.summary}</p>

      <div className="mt-4 rounded-xl bg-[#eef5fb] p-4">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#0f5fa8] uppercase">
          {copy.connectionLabel}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{product.connection}</p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {product.links.length > 0 ? (
          product.links.map((link) => (
            <a
              key={link.url}
              href={ecosystemHref(link.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-[#146fc2]/50 hover:text-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
            >
              {link.label}
              <span className="sr-only"> {copy.newTab}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>
          ))
        ) : (
          <p className="text-sm font-medium text-slate-600">{copy.noPublicSite}</p>
        )}
      </div>
    </article>
  );
}
