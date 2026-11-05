import { ClipboardList, Compass, Megaphone, Video } from 'lucide-react';

import type { CoachingQuickLink } from '@/components/coaching-portal/visual/CoachingQuickLinks';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';

export function coachingHomeQuickLinks(options: {
  marketingReady: boolean;
  proposedFixCount: number;
}): CoachingQuickLink[] {
  const links: CoachingQuickLink[] = [
    {
      href: coachingPortalPath('/plan'),
      label: 'My plan',
      description: 'Direction and monthly focus',
      icon: Compass,
    },
    {
      href: coachingPortalPath('/actions'),
      label: 'Actions',
      description:
        options.proposedFixCount > 0
          ? `${options.proposedFixCount} fix${options.proposedFixCount === 1 ? '' : 'es'} awaiting coach`
          : 'This month’s commitments',
      icon: ClipboardList,
    },
    {
      href: coachingPortalPath('/sessions'),
      label: 'Sessions',
      description: 'Prep, join, history',
      icon: Video,
    },
  ];
  if (options.marketingReady) {
    links.push({
      href: coachingPortalPath('/marketing'),
      label: 'Marketing pack',
      description: 'Review, checklist, social drafts',
      icon: Megaphone,
    });
  }
  return links;
}
