import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { todayInBrisbane } from '@/lib/marketing/roadshow-stops';
import { requireCron } from '@/lib/server/cron-auth';

type Deps = { revalidatePath: (path: string) => void; now: () => Date };

const defaultDeps: Deps = { revalidatePath, now: () => new Date() };

/**
 * Purges the homepage's ISR cache. Scheduled at Brisbane midnight so a render cached on a
 * roadshow stop's last day is never served after it (GP-545): time-based ISR hands out the
 * stale copy while it regenerates, an on-demand purge does not. Re-running is harmless.
 * Guarded by the shared cron auth: no secret configured means 503, a wrong token means 401,
 * and in neither case is anything purged. The events page is purged in the same call so
 * leftover roadshow copy cannot linger after the homepage date gate has flipped.
 */
const HOMEPAGE_REVALIDATE_PATHS = ['/', '/events/ccw-roadshow'] as const;

export function revalidateHomepage(request: Request, deps: Deps = defaultDeps): NextResponse {
  const denied = requireCron(request);
  if (denied) return denied;
  for (const path of HOMEPAGE_REVALIDATE_PATHS) deps.revalidatePath(path);
  return NextResponse.json({
    ok: true,
    revalidated: [...HOMEPAGE_REVALIDATE_PATHS],
    brisbaneDay: todayInBrisbane(deps.now()),
  });
}
