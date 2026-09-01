import { ExternalLink } from 'lucide-react';

import { LANDING_EYEBROW_CLASS } from '@/components/landing/public-shell-width';
import {
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

export type IndustryEvidenceLink = {
  title: string;
  publisher: string;
  context: string;
  href: string;
};

interface IndustryEvidenceLinksProps {
  links: IndustryEvidenceLink[];
}

export function IndustryEvidenceLinks({ links }: IndustryEvidenceLinksProps) {
  return (
    <aside className="py-16 md:py-20" aria-labelledby="industry-evidence-heading">
      <div className={`rounded-[1.75rem] p-5 sm:p-7 ${marketingPanel}`}>
        <div className="max-w-3xl">
          <p className={LANDING_EYEBROW_CLASS}>Australian source notes</p>
          <h2
            id="industry-evidence-heading"
            className={`mt-2 text-xl font-semibold ${marketingTextStrong}`}
          >
            Check the current guidance before work starts
          </h2>
          <p className={`mt-2 text-sm leading-relaxed ${marketingTextMuted}`}>
            These public sources support the market and compliance context on this page. Site
            procedures, contracts and regulator guidance always take priority for the job at hand.
          </p>
        </div>

        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full items-start justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 transition hover:border-[#146fc2]/35 hover:bg-white"
              >
                <span>
                  <span className={`block text-sm font-semibold ${marketingTextStrong}`}>
                    {link.title}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-[#146fc2]">
                    {link.publisher}
                  </span>
                  <span className={`mt-2 block text-xs leading-relaxed ${marketingTextMuted}`}>
                    {link.context}
                  </span>
                </span>
                <ExternalLink
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[#146fc2]"
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
