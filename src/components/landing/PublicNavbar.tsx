import Image from 'next/image';
import Link from 'next/link';

import { AuthNavLinks } from '@/components/landing/AuthNavLinks';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';

import MobileNav from './MobileNav';

const primaryNavItems = [
  { label: 'Courses', href: '/courses' },
  { label: 'Pathways', href: '/pathways' },
  { label: 'Start Smart', href: '/start-carpet-cleaning-business' },
  { label: 'Pricing', href: '/pricing' },
];

/**
 * Shared public navigation bar — identical to the homepage nav.
 * Used in the (public) layout so every public page gets consistent navigation.
 */
export function PublicNavbar() {
  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(8,12,20,0.94)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/logo1.png"
              alt="CARSI"
              width={240}
              height={64}
              className="h-12 w-auto max-w-[min(240px,46vw)] object-contain object-left"
              priority
            />
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm transition-colors duration-150 hover:text-white"
                style={{ color: 'rgba(255,255,255,0.72)' }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <AuthNavLinks variant="desktop" />
          </div>

          {/* Mobile hamburger menu */}
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
