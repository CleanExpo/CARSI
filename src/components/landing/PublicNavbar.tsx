import Link from 'next/link';

import { AuthNavLinks } from '@/components/landing/AuthNavLinks';
import { PublicLogo } from '@/components/landing/PublicLogo';
import {
  PUBLIC_CHROME_LINK_CLASS,
  PUBLIC_CHROME_NAV_CLASS,
  PUBLIC_LIGHT_LINK_CLASS,
  PUBLIC_LIGHT_NAV_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { PUBLIC_PRIMARY_NAV } from '@/lib/navigation/public-nav';
import { designationsEnabled } from '@/lib/server/designations-flag';

import MobileNav from './MobileNav';

/**
 * Shared public navigation bar. Identical on every public page and the homepage.
 * Only high-value product links; secondary routes are in the footer.
 */
export function PublicNavbar({ tone = 'chrome' }: { tone?: 'chrome' | 'light' }) {
  const navItems: readonly { label: string; href: string }[] = designationsEnabled()
    ? [...PUBLIC_PRIMARY_NAV, { label: 'Designations', href: '/designations' }]
    : PUBLIC_PRIMARY_NAV;

  const isLight = tone === 'light';

  return (
    <nav
      aria-label="Main navigation"
      className={isLight ? PUBLIC_LIGHT_NAV_CLASS : PUBLIC_CHROME_NAV_CLASS}
    >
      {!isLight ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_0%_0%,rgba(36,144,237,0.12),transparent_58%)]"
          aria-hidden
        />
      ) : null}
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="flex h-[72px] items-center justify-between gap-4">
          <Link href="/" aria-label="CARSI home" className="flex shrink-0 items-center gap-2">
            <PublicLogo variant="nav" surface={isLight ? 'light' : 'chrome'} />
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isLight ? PUBLIC_LIGHT_LINK_CLASS : PUBLIC_CHROME_LINK_CLASS}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <AuthNavLinks variant="desktop" tone={isLight ? 'light' : 'chrome'} />
          </div>

          <MobileNav items={navItems} tone={isLight ? 'light' : 'chrome'} />
        </div>
      </div>
    </nav>
  );
}
