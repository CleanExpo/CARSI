/**
 * Who is an admin RIGHT NOW, read from the database on every request (release-gate r6, r7, r8).
 *
 * Session tokens carry a role for seven days, so a token alone cannot prove someone is still an
 * admin: a demoted or deactivated admin would keep moderating and switching emails until it
 * expired. Every review-admin action — review moderation, and reads of hidden reviews, their
 * reasons and the moderation summary — goes through this ONE function.
 *
 * WHERE THE SESSION CAME FROM DECIDES WHAT IT MAY BE (release-gate r8). Public self-registration
 * does not verify inbox ownership, so an LMS session's email proves nothing about who holds that
 * address: anyone can register ADMIN_EMAIL or an allow-listed address if no account exists yet.
 *   - admin cookie (the legacy admin-password login, signed with the admin secret): the bootstrap
 *     ADMIN_EMAIL, or an admin_users account that is active with role 'admin' now;
 *   - LMS session: ONLY a user (by the token's user id) who is active now AND whose EFFECTIVE role
 *     is 'admin' now — computed exactly as the session token's role is (pickSessionRole:
 *     lms_user_roles first, then the lms_users.role column). No email makes an LMS session an
 *     admin: not a founder address and not a configured staff address (founder decision
 *     19/10/2026).
 * Rows are read FOR SHARE: inside a transaction, a concurrent deactivation, column change or
 * removal of a role row either commits first (and is seen here) or waits until the action has
 * committed.
 */
import { getAdminEmail } from '@/lib/admin/admin-panel-access';
import { cutoffSeconds, issuedWithinCutoff } from '@/lib/auth/session-cutoff';
import { pickSessionRole } from '@/lib/server/lms-auth';

export type CurrentAdmin = {
  kind: 'bootstrap_admin' | 'admin_user' | 'lms_admin';
  /** admin_users.id or lms_users.id at the time of the action; null for the bootstrap admin. */
  ref: string | null;
  email: string;
};

/** A verified session and the mechanism that verified it. Never built from a request body. */
export type AdminSessionProvenance =
  { via: 'admin_cookie'; email: string } | { via: 'lms_session'; userId: string; email: string };

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
  session: AdminSessionProvenance | null | undefined
): Promise<CurrentAdmin | null> {
  if (!session) return null;

  if (session.via === 'admin_cookie') {
    const email = session.email?.trim().toLowerCase();
    if (!email) return null;
    const bootstrap = getAdminEmail().trim().toLowerCase();
    if (bootstrap && email === bootstrap) return { kind: 'bootstrap_admin', ref: null, email };
    const admins = await db.$queryRaw<Array<{ id: string; is_active: boolean; role: string }>>`
      SELECT "id", "is_active", "role" FROM "admin_users" WHERE lower("email") = ${email} FOR SHARE`;
    const admin = admins[0];
    if (admin && admin.is_active && admin.role.trim().toLowerCase() === 'admin') {
      return { kind: 'admin_user', ref: admin.id, email };
    }
    return null;
  }

  if (session.via !== 'lms_session' || !session.userId) return null;
  const users = await db.$queryRaw<
    Array<{ id: string; email: string; is_active: boolean; role: string | null }>
  >`
    SELECT "id", "email", "is_active", "role" FROM "lms_users" WHERE "id" = ${session.userId}::uuid FOR SHARE`;
  const user = users[0];
  if (!user || !user.is_active) return null;
  const email = user.email.trim().toLowerCase();
  const roleRows = await db.$queryRaw<Array<{ name: string }>>`
    SELECT r."name" FROM "lms_user_roles" ur JOIN "lms_roles" r ON r."id" = ur."role_id"
     WHERE ur."user_id" = ${user.id}::uuid FOR SHARE OF ur`;
  const isAdminRole =
    pickSessionRole(
      roleRows.map((r) => r.name),
      user.role
    ) === 'admin';
  if (isAdminRole) return { kind: 'lms_admin', ref: user.id, email };
  return null;
}

/** An LMS user as the database has them now (GP-760). */
export type LmsUserNow = {
  active: boolean;
  /** Effective role: pickSessionRole over lms_user_roles, then the lms_users.role column. */
  role: string;
  /** lms_users.sessions_valid_after_sec, or null when no cut-off is recorded. */
  validAfterSec: number | null;
};

/**
 * GP-760: read one LMS user's active flag, effective role and sessions cut-off in ONE statement
 * (primary-key lookup on lms_users plus its lms_user_roles rows). The role is computed by
 * pickSessionRole, exactly as the session token and resolveCurrentAdmin compute it. Null when the
 * user does not exist. No row locks: this gates a request, it does not order an action; actions
 * that must be ordered against a demotion use resolveCurrentAdmin inside their transaction.
 */
export async function readLmsUserNow(db: RawQueryClient, userId: string): Promise<LmsUserNow | null> {
  if (!userId) return null;
  const rows = await db.$queryRaw<
    Array<{
      is_active: boolean;
      role: string | null;
      sessions_valid_after_sec: bigint | number | string | null;
      role_names: string[] | null;
    }>
  >`
    SELECT u."is_active", u."role", u."sessions_valid_after_sec",
           array_remove(array_agg(r."name"), NULL) AS "role_names"
      FROM "lms_users" u
      LEFT JOIN "lms_user_roles" ur ON ur."user_id" = u."id"
      LEFT JOIN "lms_roles" r ON r."id" = ur."role_id"
     WHERE u."id" = ${userId}::uuid
     GROUP BY u."id"`;
  const user = rows[0];
  if (!user) return null;
  return {
    active: user.is_active === true,
    role: pickSessionRole(user.role_names ?? [], user.role),
    validAfterSec: cutoffSeconds(user.sessions_valid_after_sec),
  };
}

/**
 * GP-760: the admin-panel gate for an LMS session (getAdminSessionOrNull), read from the database
 * on every request (readLmsUserNow, no cache). True only when the user is active now, the session
 * was issued within the user's sessions cut-off (a password reset ends older sessions), and the
 * user's effective role is 'admin' now. The token's role claim is never consulted.
 */
export async function isLmsAdminNow(
  db: RawQueryClient,
  userId: string,
  issuedAt: number | undefined
): Promise<boolean> {
  const user = await readLmsUserNow(db, userId);
  if (!user || !user.active) return false;
  if (!issuedWithinCutoff(issuedAt, user.validAfterSec)) return false;
  return user.role === 'admin';
}

/** resolveCurrentAdmin, or throw NotCurrentAdminError (use inside the action's transaction). */
export async function requireCurrentAdmin(
  db: RawQueryClient,
  session: AdminSessionProvenance | null | undefined
): Promise<CurrentAdmin> {
  const admin = await resolveCurrentAdmin(db, session);
  if (!admin) throw new NotCurrentAdminError();
  return admin;
}

/** Someone who may publish or clear a public reply to a review: a current admin, or an instructor now. */
export type CurrentReviewManager =
  | (CurrentAdmin & { lmsUserId: string | null })
  | { kind: 'lms_instructor'; ref: string; email: string; lmsUserId: string };

/** Thrown when a reply cannot be attributed to a current admin or instructor. */
export class NotCurrentReviewManagerError extends Error {
  constructor() {
    super('This reply cannot be attributed to a current instructor or admin.');
    this.name = 'NotCurrentReviewManagerError';
  }
}

/**
 * Review replies (release-gate r10): a CURRENT admin (resolveCurrentAdmin — the one rule), or an LMS
 * user who is active now and whose effective database role is 'instructor' now (pickSessionRole, the
 * same rule as the session token). Never the token's role claim. Rows are read FOR SHARE, so inside
 * the reply's transaction a concurrent demotion either commits first or waits.
 */
export async function resolveCurrentReviewManager(
  db: RawQueryClient,
  session: AdminSessionProvenance | null | undefined
): Promise<CurrentReviewManager | null> {
  const admin = await resolveCurrentAdmin(db, session);
  if (admin) return { ...admin, lmsUserId: admin.kind === 'lms_admin' ? admin.ref : null };
  if (!session || session.via !== 'lms_session' || !session.userId) return null;
  const users = await db.$queryRaw<
    Array<{ id: string; email: string; is_active: boolean; role: string | null }>
  >`
    SELECT "id", "email", "is_active", "role" FROM "lms_users" WHERE "id" = ${session.userId}::uuid FOR SHARE`;
  const user = users[0];
  if (!user || !user.is_active) return null;
  const roleRows = await db.$queryRaw<Array<{ name: string }>>`
    SELECT r."name" FROM "lms_user_roles" ur JOIN "lms_roles" r ON r."id" = ur."role_id"
     WHERE ur."user_id" = ${user.id}::uuid FOR SHARE OF ur`;
  const effective = pickSessionRole(
    roleRows.map((r) => r.name),
    user.role
  );
  if (effective !== 'instructor') return null;
  return {
    kind: 'lms_instructor',
    ref: user.id,
    email: user.email.trim().toLowerCase(),
    lmsUserId: user.id,
  };
}

/** resolveCurrentReviewManager, or throw NotCurrentReviewManagerError (inside the reply's transaction). */
export async function requireCurrentReviewManager(
  db: RawQueryClient,
  session: AdminSessionProvenance | null | undefined
): Promise<CurrentReviewManager> {
  const manager = await resolveCurrentReviewManager(db, session);
  if (!manager) throw new NotCurrentReviewManagerError();
  return manager;
}
