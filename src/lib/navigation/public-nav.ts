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
