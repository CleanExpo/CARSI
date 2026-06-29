import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subscribe — Membership & CEC Access',
  description:
    'Start your CARSI membership to unlock 100% access to IICRC-aligned CEC courses, progress tracking, and verified completion certificates.',
  alternates: { canonical: 'https://carsi.com.au/subscribe' },
  openGraph: {
    title: 'Subscribe | CARSI',
    description:
      'Become a CARSI member for full access to IICRC-aligned restoration CEC courses.',
    type: 'website',
    url: 'https://carsi.com.au/subscribe',
  },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
