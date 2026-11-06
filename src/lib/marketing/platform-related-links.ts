import { authorityPath } from '@/lib/marketing/authority';
import { ROLE_GUIDES_HUB_PATH } from '@/lib/marketing/role-guides-path';
import { startSmartBasePath } from '@/lib/marketing/start-smart';

export type PlatformRelatedLink = {
  href: string;
  label: string;
  detail: string;
};

/** Three contextual next steps per platform page — not a duplicate 8-up grid. */
export const PLATFORM_RELATED_BY_HREF: Record<string, PlatformRelatedLink[]> = {
  '/restoration-training-cost-australia': [
    { href: '/courses', label: 'Course catalogue', detail: 'Live price and duration on every course' },
    { href: '/pricing', label: 'Membership tiers', detail: 'Compare access options in one place' },
    {
      href: startSmartBasePath,
      label: 'Start Smart',
      detail: 'Budget training before you buy gear',
    },
  ],
  '/ccw-training': [
    {
      href: '/ccw-training/workshop',
      label: 'CCW Workshop',
      detail: 'Two days hands-on on the tools',
    },
    {
      href: '/events/ccw-roadshow',
      label: 'Business Growth Days',
      detail: 'Live events when scheduled',
    },
    {
      href: '/restoration-training-cost-australia',
      label: 'Training costs',
      detail: 'Separate coaching from course spend',
    },
  ],
  '/ccw-training/workshop': [
    {
      href: '/ccw-training',
      label: 'Business Coaching',
      detail: 'Monthly owner plan after the workshop',
    },
    { href: '/courses', label: 'Online courses', detail: 'Keep learning between deliveries' },
    {
      href: startSmartBasePath,
      label: 'Start Smart',
      detail: 'Equipment and chemistry before quoting',
    },
  ],
  [startSmartBasePath]: [
    { href: '/courses', label: 'CARSI courses', detail: 'Turn readiness into credentials' },
    {
      href: '/restoration-training-cost-australia',
      label: 'Training costs',
      detail: 'Price with sources, not guesswork',
    },
    { href: authorityPath, label: 'Authority Hub', detail: 'Cited sources for buyer questions' },
  ],
  [authorityPath]: [
    {
      href: ROLE_GUIDES_HUB_PATH,
      label: 'Role guides',
      detail: 'Audience-specific course bundles',
    },
    { href: '/research', label: 'Research library', detail: 'Published articles and case notes' },
    { href: '/submit', label: 'Submit evidence', detail: 'Field notes and corrections' },
  ],
  [ROLE_GUIDES_HUB_PATH]: [
    { href: authorityPath, label: 'Authority Hub', detail: 'Citation packs and machine assets' },
    { href: '/courses', label: 'Live courses', detail: 'What each guide links to today' },
    { href: '/industries', label: 'Industries hub', detail: 'Broader sector entry points' },
  ],
  '/testimonials': [
    { href: '/courses', label: 'Start learning', detail: 'Same platform these teams used' },
    { href: '/pricing', label: 'Pricing', detail: 'Per-course and membership options' },
    { href: '/podcast', label: 'Podcast directory', detail: 'Industry voices CARSI curates' },
  ],
  '/podcast': [
    { href: '/courses', label: 'CARSI training', detail: 'Courses operators mention on shows' },
    { href: authorityPath, label: 'Authority Hub', detail: 'Cite or submit industry media' },
    { href: '/contact', label: 'List your show', detail: 'Free directory for AU pros' },
  ],
};

export function platformRelatedLinks(href: string): PlatformRelatedLink[] {
  return PLATFORM_RELATED_BY_HREF[href] ?? [];
}
