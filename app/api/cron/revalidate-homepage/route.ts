import { revalidateHomepage } from '@/lib/server/homepage-revalidation';

/**
 * Homepage cache purge at Brisbane midnight (GP-545), so the Growth Days ticket never serves a
 * roadshow stop after its last day. Wire to a scheduler hitting this at 14:00 UTC with
 * `Authorization: Bearer $CRON_SECRET` (see .github/workflows/homepage-midnight-revalidate.yml).
 */
export async function GET(request: Request) {
  return revalidateHomepage(request);
}
