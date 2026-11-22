import {
  ArrowRight,
  BadgeCheck,
  GraduationCap,
  PlayCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import {
  COACHING_CTA_EVENT,
  COURSE_CTA_EVENT,
  EMPLOYER_TRUST_CTA_EVENT,
} from '@/lib/analytics/carsi-events';
import { catalogueCourseTitle } from '@/lib/marketing/authority-catalogue-titles';
import type { AuthorityPageEntry } from '@/lib/marketing/authority-pages';
import {
  roleGuideEmployerTrustLinks,
  roleGuideSecondaryCtas,
  roleGuideStartHereCourses,
} from '@/lib/marketing/role-guide-conversion';

const CARD_LINK_CLASS =
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:border-[#2490ed]/40 hover:shadow-[0_20px_44px_-28px_rgba(20,111,194,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:ring-offset-2';

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
        className="relative overflow-hidden border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-20"
        data-testid="role-guide-start-here"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(36,144,237,0.07)_0%,transparent_45%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
          <p className={LANDING_EYEBROW_CLASS}>Start here</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
            Three ways to move this week
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            Pick a live course to enrol, or talk to us about coaching if you run the business side
            of the work.
          </p>

          {startHere.length > 0 ? (
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {startHere.map((course, index) => (
                <li key={course.slug}>
                  <Link
                    href={course.href}
                    data-carsi-event={COURSE_CTA_EVENT}
                    data-carsi-context={`role-guide:${entry.slug}:start-${index + 1}`}
                    className={CARD_LINK_CLASS}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-[#f4f8fc] px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                        <GraduationCap className="h-3.5 w-3.5 text-[#146fc2]" aria-hidden />
                        Course {index + 1}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-500/20">
                        Live
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="flex-1 text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
                        {course.label}
                      </p>
                      <span className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[#146fc2]">
                        View course
                        <ArrowRight
                          className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/90 px-5 py-6">
              <p className="text-sm text-slate-600">
                Live courses for this guide are still publishing — browse the catalogue or talk to us
                about the best starting point for your team.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/courses"
                  data-carsi-event={COURSE_CTA_EVENT}
                  data-carsi-context={`role-guide:${entry.slug}:catalogue-fallback`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-6 text-sm font-semibold text-white shadow-[0_12px_32px_-14px_rgba(20,111,194,0.45)] hover:bg-[#0f5fa8]"
                >
                  Browse courses
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/35 hover:text-[#146fc2]"
                >
                  Contact CARSI
                </Link>
              </div>
            </div>
          )}

          {secondary.length > 0 ? (
            <>
              <div className="my-10 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200/80" aria-hidden />
                <span className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                  Grow the business
                </span>
                <span className="h-px flex-1 bg-slate-200/80" aria-hidden />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {secondary.map((cta) => {
                  const isDemo = cta.href.includes('partner-demo');
                  const Icon = isDemo ? PlayCircle : Users;
                  return (
                    <Link
                      key={cta.href}
                      href={cta.href}
                      data-carsi-event={COACHING_CTA_EVENT}
                      data-carsi-context={`role-guide:${entry.slug}`}
                      className={`${CARD_LINK_CLASS} p-5 sm:p-6`}
                    >
                      <div className="flex gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#146fc2]/10 text-[#146fc2] ring-1 ring-[#2490ed]/15">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-950 group-hover:text-[#146fc2]">
                            {cta.label}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {cta.detail}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#146fc2]">
                            Learn more
                            <ArrowRight className="h-4 w-4" aria-hidden />
                          </span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section
        className="border-t border-slate-200/70 bg-white py-12 md:py-16"
        data-testid="role-guide-employer-trust"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className={LANDING_EYEBROW_CLASS}>For employers &amp; managers</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-950 md:text-2xl">
                Training records and WHS alignment
              </h2>
              <p className={`mt-3 text-sm text-slate-600 md:text-base ${LANDING_LEAD_CLASS}`}>
                Paths for team pricing, fundamentals and the training records you can request from
                CARSI.
              </p>
            </div>
            <BadgeCheck className="hidden h-10 w-10 text-[#146fc2]/35 md:block" aria-hidden />
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {employer.map((link, index) => (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  data-carsi-event={EMPLOYER_TRUST_CTA_EVENT}
                  data-carsi-context={`role-guide:${entry.slug}:employer-${index + 1}`}
                  className={`${CARD_LINK_CLASS} min-h-full p-5`}
                >
                  <ShieldCheck className="h-5 w-5 text-[#146fc2]" aria-hidden />
                  <p className="mt-3 font-semibold text-slate-900">{link.label}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{link.detail}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#146fc2]">
                    Open
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
