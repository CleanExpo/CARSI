'use client';

import { CampusTopBar } from '@/components/layout/CampusTopBar';

export function DashboardCatalogueHeader() {
  return (
    <CampusTopBar
      section="Campus · Catalogue"
      breadcrumbs={[
        { label: 'My learning', href: '/dashboard/student' },
        { label: 'Browse courses' },
      ]}
    />
  );
}
