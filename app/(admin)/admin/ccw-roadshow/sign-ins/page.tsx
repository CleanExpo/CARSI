import { notFound } from 'next/navigation';

import { AdminCcwSignInsClient } from '@/components/admin/AdminCcwSignInsClient';
import { isCcwAttendanceEnabled } from '@/lib/server/ccw-attendance/flag';

export const dynamic = 'force-dynamic';

/**
 * Admin sign-in roster for the CCW/CARSI attendance foundation. DARK behind
 * `CCW_ATTENDANCE_ENABLED`: when the flag is off this whole page is a 404. The
 * client below fetches from `/api/admin/ccw-roadshow/sign-ins`, which enforces
 * admin auth + the same flag.
 */
export default function AdminCcwSignInsPage() {
  if (!isCcwAttendanceEnabled()) {
    notFound();
  }
  return <AdminCcwSignInsClient />;
}
