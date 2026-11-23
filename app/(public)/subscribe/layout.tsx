import type { Metadata } from 'next';

import { OG_IMAGES } from '@/lib/seo/og-image';
import { OG_LOCALE_FIELDS } from '@/lib/seo/locale';

export const metadata: Metadata = {
  title: 'Subscribe — CARSI Membership',
  description:
    'Start your CARSI membership for access to every published CARSI course, progress tracking and verified completion certificates. CEC hours apply only to courses the IICRC has approved.',
  alternates: { canonical: 'https://carsi.com.au/subscribe' },
  openGraph: {
    ...OG_LOCALE_FIELDS,
    images: OG_IMAGES,
    title: 'Subscribe | CARSI',
    description:
      'Become a CARSI member for access to every published CARSI course. CEC hours apply only to courses the IICRC has approved.',
    type: 'website',
    url: 'https://carsi.com.au/subscribe',
  },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
