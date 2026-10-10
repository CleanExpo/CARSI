import { carsiCoachingPortalPath } from '@/lib/marketing/carsi-coaching-program';

/** Coaching workspace base path (`/dashboard/coaching`). */
export const coachingPortalBasePath = carsiCoachingPortalPath;

export function coachingPortalPath(segment = ''): string {
  if (!segment) return coachingPortalBasePath;
  const normalized = segment.startsWith('/') ? segment : `/${segment}`;
  return `${coachingPortalBasePath}${normalized}`;
}
