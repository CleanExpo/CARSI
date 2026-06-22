import Link from 'next/link';

import { AuthNavLinks } from '@/components/landing/AuthNavLinks';
import { PublicLogo } from '@/components/landing/PublicLogo';
import { PublicThemeToggle } from '@/components/landing/PublicThemeToggle';
import {
  PUBLIC_CHROME_LINK_CLASS,
  PUBLIC_CHROME_NAV_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

import { startSmartBasePath } from '@/lib/marketing/start-smart';

import MobileNav from './MobileNav';

const primaryNavItems = [
  { label: 'Courses', href: '/courses' },
  { label: 'Pathways', href: '/pathways' },
  { label: 'Start Smart', href: startSmartBasePath },
  { label: 'Events', href: '/events/ccw-roadshow' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
];

/**
 * Shared public navigation bar — identical to the homepage nav.
 * Used in the (public) layout so every public page gets consistent navigation.
 */
export function PublicNavbar() {
  return (
    <nav aria-label="Main navigation" className={PUBLIC_CHROME_NAV_CLASS}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_0%_0%,rgba(36,144,237,0.12),transparent_58%)]"
        aria-hidden
      />
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="flex h-[72px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <PublicLogo variant="nav" />
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {primaryNavItems.map((item) => (
              <Link key={item.href} href={item.href} className={PUBLIC_CHROME_LINK_CLASS}>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <PublicThemeToggle />
            <AuthNavLinks variant="desktop" tone="chrome" />
          </div>

          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
