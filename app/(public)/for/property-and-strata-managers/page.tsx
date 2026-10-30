import type { Metadata } from 'next';

import { AuthorityPageView } from '@/components/industries/AuthorityPageView';
import { buildAuthorityMetadata } from '@/lib/marketing/authority-metadata';
import { getAuthorityPage } from '@/lib/marketing/authority-pages';

export const dynamic = 'force-dynamic';

const entry = getAuthorityPage('property-and-strata-managers');

export const metadata: Metadata = buildAuthorityMetadata(entry);

export default function Page() {
  return <AuthorityPageView entry={entry} />;
}
