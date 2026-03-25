import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-[#050505] py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm tracking-wide text-muted-foreground">
          CARSI — Restoration Training Platform
        </p>
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
