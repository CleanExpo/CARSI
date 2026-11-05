import type { Metadata } from 'next';

import {
  COACHING_PAGE_META,
  type CoachingPageMetaKey,
} from '@/lib/coaching-portal/coaching-page-meta';

const SITE = 'CARSI Business Coaching';

export function coachingRouteMetadata(key: CoachingPageMetaKey): Metadata {
  const meta = COACHING_PAGE_META[key];
  return {
    title: `${meta.title} | ${SITE}`,
    description: meta.description,
    robots: { index: false, follow: false },
  };
}
