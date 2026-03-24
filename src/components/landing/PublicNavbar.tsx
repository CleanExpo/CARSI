import Link from 'next/link';
import { MobileNav } from './MobileNav';

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
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-sm font-bold text-white"
              style={{ background: '#2490ed' }}
            >
              C
            </div>
            <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              CARSI
            </span>
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
            <Link
              href="/login"
              className="text-sm transition-colors duration-150 hover:text-white"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Sign In
            </Link>
            <Link
              href="/courses"
              className="rounded-sm px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02]"
              style={{ background: '#ed9d24' }}
            >
              Browse Courses
            </Link>
          </div>

          {/* Mobile hamburger menu */}
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
