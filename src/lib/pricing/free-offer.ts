/**
 * GP-574. What the pricing page may offer for free. Only two things are really free on the site:
 * courses marked Free in the catalogue (a free account enrols in them with no payment step;
 * app/api/lms/checkout/route.ts answers `enrolled: true` without Stripe), and the Free Resources
 * page of open-licence government guides, which needs no account. The old "Free Library" card
 * listed ten items that the site does not publish; do not add an item here unless it exists.
 *
 * No course count is printed: the number of free courses changes when prices are imported.
 */
export const FREE_OFFER = {
  title: 'Free courses and resources',
  priceSuffix: 'No card required',
  features: [
    'Courses marked Free in the catalogue: create a free account and enrol, with no payment step',
    'Free Resources: open-licence government guides on moisture, ventilation, timber floors, flooding and mould, with no account needed',
  ],
  cta: 'Browse free courses',
  /** Opens /courses on its Free tab (resolveDisciplineParam('free') === 'Free'). */
  href: '/courses?discipline=free',
  resourcesHref: '/resources',
} as const;
