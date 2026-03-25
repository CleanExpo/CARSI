import Link from 'next/link';
import { MobileNav } from './MobileNav';

export function PublicNavbar() {
  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
              C
            </div>
            <span className="font-semibold text-foreground">CARSI</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {['Courses', 'Industries', 'Pricing', 'About'].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-carsi-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-carsi-orange/90"
            >
              Get Started Free
            </Link>
          </div>

          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
