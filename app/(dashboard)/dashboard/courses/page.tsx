import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IICRC-Approved Restoration Training Courses | CARSI',
  description:
    'What courses does CARSI offer? Browse 91+ IICRC CEC-approved restoration and cleaning courses across WRT, CRT, ASD, AMRT, FSRT, OCT and CCT disciplines. Earn continuing education credits online.',
};

export { default } from '../../../(public)/courses/page';
