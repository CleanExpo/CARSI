import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardCheck,
  HardHat,
  House,
  SprayCan,
  Stethoscope,
} from 'lucide-react';

import { authorityPages, type AuthorityHeroImage, type AuthorityIcon, type AuthorityPageEntry } from '@/lib/marketing/authority-pages';
import { roleGuidePagePath } from '@/lib/marketing/role-guides-path';

const ICONS: Record<AuthorityIcon, LucideIcon> = {
  hardhat: HardHat,
  clipboard: ClipboardCheck,
  building: Building2,
  stethoscope: Stethoscope,
  home: House,
  spray: SprayCan,
};

export type AuthorityForNavItem = {
  slug: AuthorityPageEntry['slug'];
  href: string;
  audience: string;
  summary: string;
  icon: LucideIcon;
  heroImage: AuthorityHeroImage | null;
};

/** Navigation cards for the six /for/<role> authority guides. */
export const authorityForNavItems: AuthorityForNavItem[] = authorityPages.map((entry) => ({
  slug: entry.slug,
  href: roleGuidePagePath(entry.slug),
  audience: entry.audience,
  summary: entry.metaDescription,
  icon: ICONS[entry.icon],
  heroImage: entry.heroImage,
}));

/** Latest claim verification date on an entry (ISO YYYY-MM-DD). */
export function authorityPageLatestVerified(entry: AuthorityPageEntry): string {
  let latest = entry.claims[0]?.lastVerified ?? entry.approvedAt ?? '1970-01-01';
  for (const claim of entry.claims) {
    if (claim.lastVerified > latest) latest = claim.lastVerified;
  }
  return latest;
}

/** Australian date for display (2026-10-20 → 20/10/2026). */
export function formatAuthorityAuDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
