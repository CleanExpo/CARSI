import type { Metadata } from 'next';

import { OG_IMAGES } from '@/lib/seo/og-image';

export const metadata: Metadata = {
  title: 'Course Ideas — Vote on What We Build Next',
  description:
    'Suggest and vote on new IICRC CEC Accredited courses for cleaning and restoration professionals. Help shape the CARSI course roadmap.',
  alternates: { canonical: 'https://carsi.com.au/ideas' },
  openGraph: {
    images: OG_IMAGES,
    title: 'Course Ideas | CARSI',
    description:
      'Suggest and vote on the next CARSI courses for cleaning and restoration professionals.',
    type: 'website',
    url: 'https://carsi.com.au/ideas',
  },
};

export default function IdeasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
