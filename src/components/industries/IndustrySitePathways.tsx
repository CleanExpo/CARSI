import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
} from '@/components/landing/public-shell-width';
import { facilityManagementSiteLinks } from '@/lib/marketing/industry-track2';
import {
  marketingPanel,
  marketingPanelHover,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

/** Track 1 site pages a facility manager should open before buying seats. */
export function IndustrySitePathways() {
  return (
    <section className="py-16 md:py-24">
      <div className="mb-9 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className={LANDING_EYEBROW_CLASS}>Site pathways</p>
          <h2 className={`mt-4 ${LANDING_DISPLAY_H2_CLASS}`}>The three sites this crew already works</h2>
        </div>
        <p className={`max-w-2xl lg:justify-self-end ${LANDING_LEAD_CLASS}`}>
          Open the technician pages first. Then collect completions and ask CARSI about team seats.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {facilityManagementSiteLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex h-full flex-col p-5 ${marketingPanel} ${marketingPanelHover}`}
          >
            <p className={`text-base font-semibold ${marketingTextStrong}`}>{item.label}</p>
            <p className={`mt-2 flex-1 text-sm leading-relaxed ${marketingTextMuted}`}>
              {item.detail}
            </p>
            <span className="mt-4 text-sm font-medium text-[#146fc2]">Open the site pathway</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
