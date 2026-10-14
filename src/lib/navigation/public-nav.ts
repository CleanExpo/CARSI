import { RESOURCE_CATEGORIES } from '@/lib/resources/categories';

/**
 * Primary public navbar — keep minimal and conversion-focused.
 * Secondary destinations (events, Start Smart, pricing, contact, industries) live in the footer.
 */
export const PUBLIC_PRIMARY_NAV = [
  { label: 'Courses', href: '/courses' },
  { label: 'Pathways', href: '/pathways' },
  { label: 'About', href: '/about' },
] as const;

export type PublicPrimaryNavItem = (typeof PUBLIC_PRIMARY_NAV)[number];

/**
 * "Free Resources" dropdown. Separate from PUBLIC_PRIMARY_NAV so the flat link list keeps its
 * shape; the header renders this as a disclosure menu on desktop and inside the mobile menu.
 */
export const PUBLIC_RESOURCES_MENU = {
  label: 'Free Resources',
  href: '/resources',
  items: [
    { label: 'All free resources', href: '/resources' },
    ...RESOURCE_CATEGORIES.map((c) => ({ label: c.label, href: `/resources#${c.id}` })),
  ],
} as const;
