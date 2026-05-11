/**
 * scripts/admin-bootstrap.ts — RA-3027.
 *
 * Copies the current `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars into the
 * `admin_users` table as the first row. Idempotent — refuses to run if
 * the table already has any rows.
 *
 * Usage (post-migration deploy):
 *
 *   ADMIN_EMAIL=ops@example.com ADMIN_PASSWORD=... npx tsx scripts/admin-bootstrap.ts
 *
 * After this script succeeds:
 *   1. Verify login still works via the admin UI
 *   2. Rotate ADMIN_PASSWORD via the admin UI (or a future password-reset
 *      flow) to a NEW value the DB-stored hash anchors to
 *   3. Remove ADMIN_EMAIL + ADMIN_PASSWORD env vars from production once
 *      multi-admin onboarding is complete
 *
 * The env-var fallback remains active in `app/api/admin/login/route.ts`
 * only while `admin_users` is empty; this script makes it inert.
 */

import { bootstrapAdminFromEnv } from '../src/lib/admin/admin-store';

async function main() {
  console.log('[admin-bootstrap] checking admin_users table...');
  try {
    const result = await bootstrapAdminFromEnv();
    if (!result) {
      console.error('[admin-bootstrap] FAILED — admin_users table already has rows. Refusing to overwrite.');
      process.exit(2);
    }
    console.log(`[admin-bootstrap] OK — created admin row:`);
    console.log(`  id:    ${result.id}`);
    console.log(`  email: ${result.email}`);
    console.log(`  role:  ${result.role}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Test login via the admin UI');
    console.log('  2. Rotate the password');
    console.log('  3. Remove ADMIN_EMAIL + ADMIN_PASSWORD env vars from prod');
  } catch (err) {
    console.error('[admin-bootstrap] FAILED with exception:', err);
    process.exit(1);
  }
}

void main();
