import { ArrowRight, GraduationCap, Route, Users } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { COACHING_CTA_EVENT, COURSE_CTA_EVENT } from '@/lib/analytics/carsi-events';

const PATHS = [
  {
    id: 'courses',
    title: 'Enrol in a live course',
    detail:
      'Browse CARSI courses, including courses approved for IICRC CECs, and start learning today.',
    href: '/courses',
    event: COURSE_CTA_EVENT,
    context: 'hub:pathfinder:courses',
    icon: GraduationCap,
  },
  {
    id: 'guides',
    title: 'Pick your role guide',
    detail: 'Source-backed pathways for builders, insurers, facility teams and more.',
    href: '#role-guides-audiences',
    event: COURSE_CTA_EVENT,
    context: 'hub:pathfinder:guides',
    icon: Route,
  },
  {
    id: 'coaching',
    title: 'Run the business side',
    detail: 'Monthly coaching, marketing pack and coach-approved growth actions.',
    href: '/ccw-training',
    event: COACHING_CTA_EVENT,
    context: 'hub:pathfinder:coaching',
    icon: Users,
  },
] as const;

export function RoleGuidesHubPathfinder() {
  return (
    <section
      className="border-b border-slate-200/80 bg-white py-10 md:py-12"
      data-testid="role-guides-pathfinder"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className="text-[11px] font-medium tracking-[0.24em] text-[#146fc2] uppercase">
          Choose your path
        </p>
        <p className={`mt-2 max-w-2xl text-sm text-slate-600 ${LANDING_LEAD_CLASS}`}>
          One starting point — whether you hire for a role, need a course this week, or want
          business coaching alongside training.
        </p>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {PATHS.map((path) => {
            const Icon = path.icon;
            return (
              <li key={path.id}>
                <Link
                  href={path.href}
                  data-carsi-event={path.event}
                  data-carsi-context={path.context}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-5 shadow-sm transition duration-200 hover:border-[#2490ed]/40 hover:bg-white hover:shadow-[0_16px_40px_-24px_rgba(20,111,194,0.4)] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#146fc2]/10 text-[#146fc2] ring-1 ring-[#2490ed]/15">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-4 font-semibold text-slate-950 group-hover:text-[#146fc2]">
                    {path.title}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {path.detail}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#146fc2]">
                    Continue
                    <ArrowRight
                      className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
