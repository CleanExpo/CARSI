import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Training record | CARSI',
  description: 'CARSI learner training and IICRC CEC summary (shared link).',
  robots: { index: false, follow: false },
};

export default function TrainingRecordLayout({ children }: { children: ReactNode }) {
  return children;
}
