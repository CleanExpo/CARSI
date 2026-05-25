import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { AdminShell } from '@/components/admin/AdminShell';
import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-auth';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { verifySessionToken } from '@/lib/auth/session-jwt';

/** Avoid DB access during `next build` (Prisma TLS to managed Postgres can fail in the build environment). */
export const dynamic = 'force-dynamic';

export default async function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSessionOrNull();
  if (session) {
    return <AdminShell>{children}</AdminShell>;
  }

  const cookieStore = await cookies();
  const lmsToken =
    cookieStore.get('auth_token')?.value ?? cookieStore.get('carsi_token')?.value;
  if (lmsToken) {
    const claims = await verifySessionToken(lmsToken);
    if (claims && !isLmsClaimsAllowedAdminPanel(claims)) {
      redirect('/dashboard/student');
    }
  }

  return <AdminAccessDenied />;
}
