/** In-app shortcuts between coaching admin surfaces (GP-561 family). */
export type AdminCoachingNavItem = {
  href: string;
  label: string;
  description: string;
};

export const ADMIN_COACHING_NAV: AdminCoachingNavItem[] = [
  {
    href: '/admin/coaching-members',
    label: 'Member workspace',
    description: 'Chapter, brief, growth plan',
  },
  {
    href: '/admin/coaching-chapters',
    label: 'Chapters',
    description: 'Registry and coach ids',
  },
  {
    href: '/admin/coaching-actions',
    label: 'Proposed actions',
    description: 'Marketing-pack approvals',
  },
  {
    href: '/admin/coaching-monthly-review',
    label: 'Monthly review',
    description: 'Fortnight accountability',
  },
  {
    href: '/admin/coaching-knowledge',
    label: 'Knowledge',
    description: 'Coach corpus',
  },
];
