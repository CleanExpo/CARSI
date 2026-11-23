import type { Metadata } from 'next';

/**
 * The page is a client component and cannot export metadata, so this layout carries it.
 * Its own title and description, not the home page's. A reset link carries a one-time token,
 * so the page is never indexed.
 */
export const metadata: Metadata = {
  title: 'Reset your password',
  description:
    'Choose a new password for your CARSI account, then sign in to carry on with your courses.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
