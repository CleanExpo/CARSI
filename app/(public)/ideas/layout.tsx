import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Course Ideas — Vote on What We Build Next',
  description:
    'Suggest and vote on new IICRC-aligned CEC courses for cleaning and restoration professionals. Help shape the CARSI course roadmap.',
  alternates: { canonical: 'https://carsi.com.au/ideas' },
  openGraph: {
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
