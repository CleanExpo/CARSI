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

export type CoachingPortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const COACHING_PORTAL_NAV_MAIN: CoachingPortalNavItem[] = [
  { href: '/coaching', label: 'Home', icon: Home },
  { href: '/coaching/plan', label: 'My Plan', icon: Compass },
  { href: '/coaching/actions', label: 'Actions', icon: ClipboardList },
  { href: '/coaching/sessions', label: 'Sessions', icon: Video },
  { href: '/coaching/resources', label: 'Resources', icon: Library },
  { href: '/coaching/billing', label: 'Billing', icon: CircleDollarSign },
  { href: '/coaching/services', label: 'Growth services', icon: Sparkles },
];
