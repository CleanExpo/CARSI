import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BookOpen,
  CircleHelp,
  GraduationCap,
  Home,
  ListOrdered,
  Settings,
  User,
} from 'lucide-react';

export type LearnerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Primary learner IA. Contextual tools stay off this list. */
export const LEARNER_NAV_PRIMARY: LearnerNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/student', label: 'My Learning', icon: GraduationCap },
  { href: '/dashboard/courses', label: 'Course Catalogue', icon: BookOpen },
];

export const LEARNER_NAV_RECORDS: LearnerNavItem[] = [
  { href: '/dashboard/student/credentials', label: 'Certificates', icon: Award },
  { href: '/dashboard/student/leaderboard', label: 'Achievements', icon: ListOrdered },
];

export const LEARNER_NAV_ACCOUNT: LearnerNavItem[] = [
  { href: '/dashboard/student/profile', label: 'Profile', icon: User },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/help', label: 'Help', icon: CircleHelp },
];

export const LEARNER_MOBILE_TABS: LearnerNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/student', label: 'Learning', icon: GraduationCap },
  { href: '/dashboard/courses', label: 'Catalogue', icon: BookOpen },
];
