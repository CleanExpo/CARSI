import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/brand/carsi-logo.webp"
            alt="CARSI"
            width={100}
            height={32}
            className="h-7 w-auto opacity-70"
            unoptimized
          />
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
      <div className="container mt-3">
        <p className="text-center text-xs tracking-wider text-muted-foreground/50">
          © {new Date().getFullYear()} CARSI Pty Ltd · ABN pending
        </p>
      </div>
    </footer>
  );
}
