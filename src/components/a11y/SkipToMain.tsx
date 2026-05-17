import Link from 'next/link';

/** WCAG 2.4.1 — skip link to main content (Phase 3). */
export function SkipToMain() {
  return (
    <Link
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#2490ed] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
    >
      Skip to main content
    </Link>
  );
}
