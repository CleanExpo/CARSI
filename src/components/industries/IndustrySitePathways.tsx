import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { facilityManagementSiteLinks } from '@/lib/marketing/industry-track2';

/** Track 1 site pages a facility manager should open before buying seats. */
export function IndustrySitePathways() {
  return (
    <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Site pathways</p>
        <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
          The three sites this crew already works
        </h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          Open the technician pages first. Then collect completions and ask CARSI about team seats.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {facilityManagementSiteLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-[#2490ed]/35 hover:shadow-[0_18px_40px_-24px_rgba(20,111,194,0.35)]"
            >
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
                {item.label}
              </p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{item.detail}</p>
              <span className="mt-5 text-sm font-medium text-[#146fc2]">Open the site pathway</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
