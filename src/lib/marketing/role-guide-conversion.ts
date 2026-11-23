import { getAuthorityPage, type AuthorityPageEntry } from '@/lib/marketing/authority-pages';
import { roleGuidePagePath } from '@/lib/marketing/role-guides-path';

export type RoleGuideStartHereCourse = {
  slug: string;
  href: string;
  label: string;
};

export type RoleGuideConversionCta = {
  href: string;
  label: string;
  detail: string;
};

export const WHS_FUNDAMENTALS_SLUG = 'whs-fundamentals-for-restoration-and-cleaning-professionals';

const COACHING_CTA: RoleGuideConversionCta = {
  href: '/ccw-training',
  label: 'Business Coaching',
  detail: 'Monthly owner plan, marketing pack and coach-approved actions — separate from course purchases',
};

const PARTNER_DEMO_CTA: RoleGuideConversionCta = {
  href: '/ccw-training/partner-demo',
  label: 'Partner demo walkthrough',
  detail: 'Ten-minute scripted tour including Advantage A7 marketing pack',
};

/**
 * Up to three **live** courses from the guide bundle, in bundle order.
 */
export function roleGuideStartHereCourses(
  entry: Pick<AuthorityPageEntry, 'bundle'>,
  liveSlugs: Set<string>,
  titleForSlug: (slug: string) => string
): RoleGuideStartHereCourse[] {
  const out: RoleGuideStartHereCourse[] = [];
  for (const slug of entry.bundle.publishedSlugs) {
    if (!liveSlugs.has(slug)) continue;
    out.push({
      slug,
      href: `/courses/${slug}`,
      label: titleForSlug(slug),
    });
    if (out.length >= 3) break;
  }
  return out;
}

/** Owner-operator audiences get coaching + demo CTAs; others get coaching optional. */
export function roleGuideSecondaryCtas(slug: AuthorityPageEntry['slug']): RoleGuideConversionCta[] {
  const coaching = [COACHING_CTA];
  const operatorSlugs: AuthorityPageEntry['slug'][] = [
    'commercial-cleaning-contractors',
    'facility-managers',
    'property-and-strata-managers',
    'nsw-builders',
  ];
  if (operatorSlugs.includes(slug)) {
    return [...coaching, PARTNER_DEMO_CTA];
  }
  return coaching;
}

export type EmployerTrustLink = {
  href: string;
  label: string;
  detail: string;
};

/** Phase 3 — WHS + employer-facing training record story (public-safe links only). */
export function roleGuideEmployerTrustLinks(liveSlugs: Set<string>): EmployerTrustLink[] {
  const links: EmployerTrustLink[] = [];
  if (liveSlugs.has(WHS_FUNDAMENTALS_SLUG)) {
    links.push({
      href: `/courses/${WHS_FUNDAMENTALS_SLUG}`,
      label: 'WHS fundamentals',
      detail: 'Work health and safety duties for restoration and cleaning teams',
    });
  }
  links.push({
    href: '/pricing',
    label: 'Team seats & membership',
    detail: 'Enrol staff and share training progress with employers',
  });
  links.push({
    href: '/contact',
    label: 'Employer training records',
    detail: 'Signed-in learners can export proof packs from their dashboard — ask us for a sample',
  });
  return links;
}

export function getRoleGuideConversion(slug: string, liveSlugs: Set<string>, titleForSlug: (slug: string) => string) {
  const entry = getAuthorityPage(slug);
  return {
    pagePath: roleGuidePagePath(slug),
    startHere: roleGuideStartHereCourses(entry, liveSlugs, titleForSlug),
    secondaryCtas: roleGuideSecondaryCtas(entry.slug),
    employerTrust: roleGuideEmployerTrustLinks(liveSlugs),
  };
}