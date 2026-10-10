import type { LucideIcon } from 'lucide-react';
import {
  CircleDollarSign,
  ClipboardList,
  Compass,
  Home,
  Library,
  Sparkles,
  Video,
} from 'lucide-react';

import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';

export type CoachingPortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const COACHING_PORTAL_NAV_MAIN: CoachingPortalNavItem[] = [
  { href: coachingPortalPath(), label: 'Home', icon: Home },
  { href: coachingPortalPath('/plan'), label: 'My Plan', icon: Compass },
  { href: coachingPortalPath('/actions'), label: 'Actions', icon: ClipboardList },
  { href: coachingPortalPath('/sessions'), label: 'Sessions', icon: Video },
  { href: coachingPortalPath('/resources'), label: 'Resources', icon: Library },
  { href: coachingPortalPath('/billing'), label: 'Billing', icon: CircleDollarSign },
  { href: coachingPortalPath('/services'), label: 'Growth services', icon: Sparkles },
];
