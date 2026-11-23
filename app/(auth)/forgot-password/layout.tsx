import type { Metadata } from 'next';

/**
 * The page is a client component and cannot export metadata, so this layout carries it.
 * Its own title and description, not the home page's. robots.txt already disallows this page.
 */
export const metadata: Metadata = {
  title: 'Forgot your password',
  description:
    'Forgot your CARSI password? Enter your email address and we will send you a link to set a new one.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
