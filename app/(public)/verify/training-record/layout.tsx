import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Training record',
  description: 'CARSI learner training record (shared link).',
  robots: { index: false, follow: false },
};

export default function TrainingRecordLayout({ children }: { children: ReactNode }) {
  return children;
}
