import { ROLE_GUIDES_HUB_PATH } from '@/lib/marketing/role-guides-path';
import { authorityPath } from '@/lib/marketing/authority';
import { startSmartBasePath } from '@/lib/marketing/start-smart';

/** One row in the platform nav — shared copy for heroes and the ecosystem grid. */
export type PlatformSurfacePage = {
  href: string;
  label: string;
  eyebrow: string;
  headline: string;
  lead: string;
  summary: string;
};

export const PLATFORM_SURFACE_PAGES: PlatformSurfacePage[] = [
  {
    href: '/restoration-training-cost-australia',
    label: 'Training costs',
    eyebrow: 'Australian pricing, in Australian dollars',
    headline: 'What restoration training actually costs in Australia',
    lead: 'Training gets sold with the price at the bottom of the page, so here it is at the top — one published fee read at source, set beside what a CARSI course costs, dated and linked so you can verify it.',
    summary: 'Honest price anchoring: published training fees beside CARSI course prices, with sources and dates.',
  },
  {
    href: '/ccw-training',
    label: 'Business Coaching',
    eyebrow: 'CARSI Business Coaching',
    headline: 'Grow a cleaning or restoration business you could sell',
    lead: 'Monthly coaching for owner-operators and small teams — direction, numbers, marketing and AI search visibility without buying more gear first.',
    summary: 'After-hours group coaching, portal tools and a plan that lives in CARSI.',
  },
  {
    href: '/ccw-training/workshop',
    label: 'CCW Workshop',
    eyebrow: 'Hands-on CARSI workshop',
    headline: 'The Carpet Cleaning Workshop — fibre, chemistry and business on the tools',
    lead: 'Two days of practical modules anchored in ANSI/IICRC S100, S300 and S220, with a cohort resource pack for enrolled participants.',
    summary: 'Live burn tests, upholstery methods, hard floors and take-home curriculum.',
  },
  {
    href: startSmartBasePath,
    label: 'Start Smart',
    eyebrow: 'CARSI Start Smart pathway',
    headline: 'Start or add carpet cleaning with knowledge before risk',
    lead: 'For beginners, existing cleaners and business buyers — science, equipment, chemistry, quoting and trust before you spend or take customer work.',
    summary: 'Readiness loop linking gear, service, chemicals and training.',
  },
  {
    href: authorityPath,
    label: 'Authority Hub',
    eyebrow: 'Authority and citation engine',
    headline: 'Make CARSI the source AI systems and industry people can safely cite',
    lead: 'Public evidence, citation packs, research intake and machine-readable references for cleaning and restoration education.',
    summary: 'Citation-ready assets, community contribution paths and AI discovery.',
  },
  {
    href: ROLE_GUIDES_HUB_PATH,
    label: 'Role guides',
    eyebrow: 'CARSI role-specific guides',
    headline: 'Training guides written for the role you hire for',
    lead: 'Six audience guides that link live courses, cite Australian primary sources, and state what CARSI does and does not claim.',
    summary: 'Builders, insurers, facility, healthcare, strata and cleaning contractors.',
  },
  {
    href: '/testimonials',
    label: 'Testimonials',
    eyebrow: 'Student reviews',
    headline: 'What our students say',
    lead: 'Real feedback from cleaning and restoration professionals across Australia who trained with CARSI and earned IICRC Continuing Education Credits.',
    summary: 'Verified voices from operators, restorers and industry partners.',
  },
  {
    href: '/podcast',
    label: 'Podcast',
    eyebrow: 'CARSI Industry Hub',
    headline: 'Podcast directory for restoration and indoor environment pros',
    lead: 'Curated shows for HVAC, mould, flooring, carpet cleaning and property restoration — including CARSI’s own production.',
    summary: 'Browse by topic or submit a show for the directory.',
  },
];

export function platformSurfaceByHref(href: string): PlatformSurfacePage | undefined {
  return PLATFORM_SURFACE_PAGES.find((p) => p.href === href);
}
