import Link from 'next/link';
import Image from 'next/image';
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
            <Image
              src="https://carsi.com.au/wp-content/uploads/2021/02/CARSI-LOGO-best-compression-2.png"
              alt="CARSI"
              width={120}
              height={40}
              className="h-9 w-auto"
              unoptimized
              priority
            />
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
              className="rounded-sm bg-carsi-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-carsi-orange/90"
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
