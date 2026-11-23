import { getAppOrigin } from '@/lib/server/app-url';

/**
 * Origin for absolute URLs on server-rendered pages (verification links, etc.).
 * GP-700: decided by `getAppOrigin`, never by the request's host headers.
 * Kept async so existing callers need no change.
 */
export async function getServerOrigin(): Promise<string> {
  return getAppOrigin();
}
