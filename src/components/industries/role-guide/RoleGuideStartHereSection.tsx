import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { COACHING_CTA_EVENT, COURSE_CTA_EVENT } from '@/lib/analytics/carsi-events';
import { catalogueCourseTitle } from '@/lib/marketing/authority-catalogue-titles';
import type { AuthorityPageEntry } from '@/lib/marketing/authority-pages';
import {
  roleGuideEmployerTrustLinks,
  roleGuideSecondaryCtas,
  roleGuideStartHereCourses,
} from '@/lib/marketing/role-guide-conversion';

const ACCENT = '#146fc2';

export function RoleGuideStartHereSection({
  entry,
  liveSlugs,
}: {
  entry: AuthorityPageEntry;
  liveSlugs: Set<string>;
}) {
  const startHere = roleGuideStartHereCourses(entry, liveSlugs, catalogueCourseTitle);
  const secondary = roleGuideSecondaryCtas(entry.slug);
  const employer = roleGuideEmployerTrustLinks(liveSlugs);

  if (startHere.length === 0 && secondary.length === 0) return null;

  return (
    <>
      <section
        className="border-t border-slate-200/70 bg-white py-16 md:py-20"
        data-testid="role-guide-start-here"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Start here</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
            Three ways to move this week
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            Pick a live course to enrol, or talk to us about coaching if you run the business side
            of the work.
          </p>

          {startHere.length > 0 ? (
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {startHere.map((course, index) => (
                <li key={course.slug}>
                  <Link
                    href={course.href}
                    data-carsi-event={COURSE_CTA_EVENT}
                    data-carsi-context={`role-guide:${entry.slug}:start-${index + 1}`}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 transition hover:border-[#2490ed]/40 hover:bg-white hover:shadow-md"
                  >
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                      Course {index + 1}
                    </p>
                    <p className="mt-2 flex-1 text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
                      {course.label}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#146fc2]">
                      View course
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-slate-600">
              Live courses for this guide are still publishing — browse the catalogue or contact us
              for the best starting point for your team.
            </p>
          )}

          <MotionSafeHr className="my-10" />

          <div className="grid gap-4 sm:grid-cols-2">
            {secondary.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                data-carsi-event={COACHING_CTA_EVENT}
                data-carsi-context={`role-guide:${entry.slug}`}
                className="rounded-2xl border border-slate-200/80 p-5 transition hover:border-[#2490ed]/35"
                style={{ borderLeftWidth: 4, borderLeftColor: ACCENT }}
              >
                <p className="font-semibold text-slate-950">{cta.label}</p>
                <p className="mt-1 text-sm text-slate-600">{cta.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-t border-slate-200/70 bg-[#f4f7fa] py-12 md:py-16"
        data-testid="role-guide-employer-trust"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>For employers &amp; managers</p>
          <h2 className={`mt-3 text-xl font-semibold text-slate-950 md:text-2xl`}>
            Training records and WHS alignment
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {employer.map((link) => (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  className="block h-full rounded-xl border border-slate-200/80 bg-white p-4 text-sm transition hover:border-[#2490ed]/30"
                >
                  <p className="font-semibold text-slate-900">{link.label}</p>
                  <p className="mt-1 text-slate-600">{link.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function MotionSafeHr({ className }: { className: string }) {
  return <hr className={`border-slate-200/80 ${className}`} />;
}
