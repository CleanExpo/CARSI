import type { Metadata } from 'next';

import { AuthorityPage } from '@/components/industries/AuthorityPage';
import { authorityMetadata } from '@/lib/marketing/authority-metadata';
import { getAuthorityPage } from '@/lib/marketing/authority-pages';

export const dynamic = 'force-dynamic';

const SLUG = 'insurance-claims-staff';

export function generateMetadata(): Promise<Metadata> {
  return authorityMetadata(getAuthorityPage(SLUG));
}

export default function Page() {
  return <AuthorityPage slug={SLUG} />;
}
