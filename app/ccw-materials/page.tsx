import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

/**
 * The CCW take-home materials now live inline inside the single hidden
 * landing page at `/ccw-training`. This route is kept only so previously
 * shared `/ccw-materials` links (from PR #52, earlier emails, etc.) keep
 * working — it permanent-redirects to the Materials section of the new
 * consolidated page.
 *
 * The backing API routes under /api/ccw-materials/* stay exactly where they
 * were: the gate POSTs to /api/ccw-materials/auth, downloads stream from
 * /api/ccw-materials/download. Only the user-facing page was consolidated.
 */

export const metadata: Metadata = {
  title: 'CCW Workshop Materials — Participant Access',
  description: 'Private take-home materials for 2-Day Carpet Cleaning Workshop participants.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function CcwMaterialsRedirect(): never {
  redirect('/ccw-training#materials');
}
