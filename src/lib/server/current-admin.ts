/**
 * Who is an admin RIGHT NOW, read from the database on every request (release-gate r6, r7).
 *
 * Session tokens carry a role for seven days, so a token alone cannot prove someone is still an
 * admin: a demoted or deactivated admin would keep moderating and switching emails until it
 * expired. Every review-admin action — the review-request email switch, review moderation, and
 * reads of hidden reviews and their reasons — goes through this ONE function.
 *
 * Accepts exactly what getAdminSessionOrNull accepts, re-checked against current data:
 *   - the bootstrap ADMIN_EMAIL (current env value);
 *   - an admin_users account that is active with role 'admin' now;
 *   - an LMS user that is active now AND whose EFFECTIVE role is 'admin' now — computed exactly as
 *     the session token's role is (pickSessionRole: lms_user_roles first, then the lms_users.role
 *     column) — or who is on the current allow-list.
 * Rows are read FOR SHARE: inside a transaction, a concurrent deactivation, column change or
 * removal of a role row either commits first (and is seen here) or waits until the action has
 * committed.
 */
import { getAdminEmail, getAdminPanelAllowedEmails } from '@/lib/admin/admin-panel-access';
import { pickSessionRole } from '@/lib/server/lms-auth';

export type CurrentAdmin = {
  kind: 'bootstrap_admin' | 'admin_user' | 'lms_admin';
  /** admin_users.id or lms_users.id at the time of the action; null for the bootstrap admin. */
  ref: string | null;
  email: string;
};

/** Thrown when an action cannot be attributed to a currently authorised admin. */
export class NotCurrentAdminError extends Error {
  constructor() {
    super('This action cannot be attributed to a currently authorised admin.');
    this.name = 'NotCurrentAdminError';
  }
}

/** A Prisma client or interactive transaction (anything that can run a tagged raw query). */
export type RawQueryClient = {
  $queryRaw: <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
};

export async function resolveCurrentAdmin(
  db: RawQueryClient,
  sessionEmail: string | null | undefined
): Promise<CurrentAdmin | null> {
  const email = sessionEmail?.trim().toLowerCase();
  if (!email) return null;
  const bootstrap = getAdminEmail().trim().toLowerCase();
  if (bootstrap && email === bootstrap) return { kind: 'bootstrap_admin', ref: null, email };

  const admins = await db.$queryRaw<Array<{ id: string; is_active: boolean; role: string }>>`
    SELECT "id", "is_active", "role" FROM "admin_users" WHERE lower("email") = ${email} FOR SHARE`;
  const admin = admins[0];
  if (admin && admin.is_active && admin.role.trim().toLowerCase() === 'admin') {
    return { kind: 'admin_user', ref: admin.id, email };
  }

  const users = await db.$queryRaw<Array<{ id: string; is_active: boolean; role: string | null }>>`
    SELECT "id", "is_active", "role" FROM "lms_users" WHERE lower("email") = ${email} FOR SHARE`;
  const user = users[0];
  if (user && user.is_active) {
    const roleRows = await db.$queryRaw<Array<{ name: string }>>`
      SELECT r."name" FROM "lms_user_roles" ur JOIN "lms_roles" r ON r."id" = ur."role_id"
       WHERE ur."user_id" = ${user.id}::uuid FOR SHARE OF ur`;
    const isAdminRole =
      pickSessionRole(
        roleRows.map((r) => r.name),
        user.role
      ) === 'admin';
    if (isAdminRole || getAdminPanelAllowedEmails().has(email))
      return { kind: 'lms_admin', ref: user.id, email };
  }
  return null;
}

/** resolveCurrentAdmin, or throw NotCurrentAdminError (use inside the action's transaction). */
export async function requireCurrentAdmin(
  db: RawQueryClient,
  sessionEmail: string | null | undefined
): Promise<CurrentAdmin> {
  const admin = await resolveCurrentAdmin(db, sessionEmail);
  if (!admin) throw new NotCurrentAdminError();
  return admin;
}
