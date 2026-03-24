import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#050505] py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="font-mono text-sm tracking-wide text-white/70">
          CARSI — Restoration Training Platform
        </p>
        <nav className="flex gap-4 font-mono text-sm text-white/50">
          <Link href="/terms" className="hover:text-white/70">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-white/70">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-white/70">
            Contact
          </Link>
        </nav>
      </div>
      <div className="container mt-3">
        <p className="text-center font-mono text-xs tracking-wider text-white/30">
          © {new Date().getFullYear()} CARSI Pty Ltd · ABN pending
        </p>
      </div>
    </footer>
  );
}
