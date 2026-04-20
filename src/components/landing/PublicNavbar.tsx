import Image from 'next/image';
import Link from 'next/link';

import { AuthNavLinks } from '@/components/landing/AuthNavLinks';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';

import MobileNav from './MobileNav';

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
        background: 'rgba(5,5,5,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/logo1.png"
              alt="CARSI"
              width={360}
              height={72}
              className="h-[72px] w-auto max-w-[min(360px,48vw)] object-contain object-left"
              priority
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {['Courses', 'Industries', 'Pathways', 'Pricing'].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                className="text-sm transition-colors duration-150 hover:text-white"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <AuthNavLinks variant="desktop" />
          </div>

          {/* Mobile hamburger menu */}
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
