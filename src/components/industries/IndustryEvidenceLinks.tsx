import { ExternalLink } from 'lucide-react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

export type IndustryEvidenceLink = {
  title: string;
  publisher: string;
  context: string;
  href: string;
};

interface IndustryEvidenceLinksProps {
  links: IndustryEvidenceLink[];
  presentation?: 'default' | 'role-guide';
}

export function IndustryEvidenceLinks({
  links,
  presentation = 'default',
}: IndustryEvidenceLinksProps) {
  const isRoleGuide = presentation === 'role-guide';

  return (
    <aside
      className={`border-t border-slate-200/70 py-16 md:py-24 ${isRoleGuide ? 'bg-[#f4f7fa]' : 'bg-white'}`}
      aria-labelledby="industry-evidence-heading"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Australian source notes</p>
        <h2 id="industry-evidence-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
          Check the current guidance before work starts
        </h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          These public sources support the market and compliance context on this page. Site
          procedures, contracts and regulator guidance always take priority for the job at hand.
        </p>

        <ul
          className={`mt-12 ${isRoleGuide ? 'divide-y divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white' : 'grid gap-6 md:grid-cols-2'}`}
        >
          {links.map((link, index) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className={
                  isRoleGuide
                    ? 'group flex flex-col gap-4 p-6 transition hover:bg-[#fafbfc] sm:flex-row sm:items-start sm:justify-between md:p-8'
                    : 'group flex h-full items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 transition hover:border-[#146fc2]/35 hover:bg-white'
                }
              >
                {isRoleGuide ? (
                  <span
                    className="font-[family-name:var(--font-display)] text-2xl leading-none font-semibold text-slate-200 tabular-nums"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ) : null}
                <span className={isRoleGuide ? 'min-w-0 flex-1' : undefined}>
                  <h3 className="text-sm font-semibold text-slate-950">{link.title}</h3>
                  <span className="mt-1 block text-xs font-medium text-[#146fc2]">
                    {link.publisher}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-slate-500">
                    {link.context}
                  </span>
                </span>
                <ExternalLink
                  className={`shrink-0 text-slate-400 transition group-hover:text-[#146fc2] ${isRoleGuide ? 'mt-1 h-4 w-4' : 'mt-0.5 h-4 w-4'}`}
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
