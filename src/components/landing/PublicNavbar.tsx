import Image from 'next/image';
import Link from 'next/link';

import { AuthNavLinks } from '@/components/landing/AuthNavLinks';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';

import MobileNav from './MobileNav';

const primaryNavItems = [
  { label: 'Courses', href: '/courses' },
  { label: 'Pathways', href: '/pathways' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
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
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(15,23,42,0.1)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="flex h-[72px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/logo1.png"
              alt="CARSI"
              width={240}
              height={64}
              className="h-auto w-auto max-h-14 max-w-[min(240px,48vw)] object-contain object-left"
              sizes="(max-width: 768px) 48vw, 240px"
              priority
            />
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none"
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
