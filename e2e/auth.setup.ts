/**
 * Playwright auth setup project.
 *
 * Performs a REAL login against the running app (the same `/api/auth/login`
 * endpoint the UI uses) so the resulting HTTP-only `auth_token` JWT cookie is a
 * genuine session that passes the Edge middleware on /dashboard/*. The session is
 * persisted to `playwright/.auth/student.json` and reused by the authenticated
 * specs via `storageState` (configured in playwright.config.ts).
 *
 * Requires the E2E student to be seeded first (scripts/seed-e2e-user.ts) and the
 * login route's JWT signing secret to be available to the server (JWT_SECRET, or
 * the dev fallback outside production).
 */
import { test as setup, expect } from '@playwright/test';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const STUDENT_STORAGE_STATE = `${__dirname}/../playwright/.auth/student.json`;

const STUDENT = {
  email: 'student@carsi.com.au',
  password: 'student123',
} as const;

setup('authenticate as student', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('input[name="email"], input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(STUDENT.email);
  await passwordInput.fill(STUDENT.password);

  await page.locator('button[type="submit"]').click();

  // A successful login redirects a student to /dashboard/student. If the
  // credentials are wrong (e.g. user not seeded) the form stays on /login and
  // shows #login-error — surface that as a clear setup failure.
  await page.waitForURL('**/dashboard**', { timeout: 20_000 });

  // Persist the real session cookie for the authenticated projects.
  await page.context().storageState({ path: STUDENT_STORAGE_STATE });
});
