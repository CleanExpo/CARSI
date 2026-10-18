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
 *     lms_user_roles first, then the lms_users.role column) — or a founder account
 *     (FOUNDER_ADMIN_EMAILS, which exist already and so cannot be self-registered).
 *     ADMIN_EMAIL and ADMIN_PANEL_EMAILS never make an LMS session an admin here.
 * Rows are read FOR SHARE: inside a transaction, a concurrent deactivation, column change or
 * removal of a role row either commits first (and is seen here) or waits until the action has
 * committed.
 */
import { getAdminEmail, isAdminAllowlistedEmail } from '@/lib/admin/admin-panel-access';
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

/**
 * The founder accounts (FOUNDER_ADMIN_EMAILS in admin-panel-access.ts, which this branch must not
 * edit or widen): the always-allowed set minus everything that comes from configuration. An
 * address that is ALSO configured is not treated as a founder here — that fails closed.
 */
export function isFounderAdminEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  const configured = new Set<string>();
  const bootstrap = getAdminEmail().toLowerCase();
  if (bootstrap) configured.add(bootstrap);
  for (const part of (process.env.ADMIN_PANEL_EMAILS ?? '').split(',')) {
    const p = part.trim().toLowerCase();
    if (p) configured.add(p);
  }
  // Same matcher as #907's reservation (isAdminAllowlistedEmail), so every founder address this
  // rule trusts is one that self-registration, guest signup and Stripe provisioning refuse to create.
  return isAdminAllowlistedEmail(e) && !configured.has(e);
}

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
  if (isAdminRole || isFounderAdminEmail(email)) return { kind: 'lms_admin', ref: user.id, email };
  return null;
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
