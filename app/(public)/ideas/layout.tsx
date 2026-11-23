import type { Metadata } from 'next';

import { OG_IMAGES } from '@/lib/seo/og-image';
import { OG_LOCALE_FIELDS } from '@/lib/seo/locale';

export const metadata: Metadata = {
  title: 'Course Ideas',
  description:
    'Suggest new CARSI courses for cleaning and restoration professionals. Course idea voting is not open yet.',
  alternates: { canonical: 'https://carsi.com.au/ideas' },
  openGraph: {
    ...OG_LOCALE_FIELDS,
    images: OG_IMAGES,
    title: 'Course Ideas | CARSI',
    description:
      'Suggest the next CARSI courses for cleaning and restoration professionals.',
    type: 'website',
    url: 'https://carsi.com.au/ideas',
  },
};

export default function IdeasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
