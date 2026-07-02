/**
 * In-app notification service (Phase A foundation).
 *
 * Backs the header bell (`src/components/lms/NotificationBell.tsx`) and gives the recert-reminder
 * (Phase B) and toolbox-talk drip (Phase C) crons an idempotent `createNotification` to write to.
 *
 * Persistence is `LmsNotification` (unique `dedupe_key`); the DTO/summary mappers are pure so they
 * can be unit-tested without a database (matching the repo's test convention).
 */

import { prisma } from '@/lib/prisma';
import { isEmailConfigured, sendEmail } from '@/lib/server/email';

/** The JSON shape the in-app bell consumes (snake_case, matches `NotificationBell.tsx`). */
export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationSummary = {
  notifications: NotificationDto[];
  unread_count: number;
};

/** Subset of the persisted `LmsNotification` row the DTO mapper needs. */
export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/** Pure: map a persisted row to the bell's snake_case DTO. */
export function toNotificationDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    action_url: row.linkUrl ?? null,
    is_read: row.readAt !== null,
    created_at: row.createdAt.toISOString(),
  };
}

/** Pure: assemble the summary payload (never emits a negative unread count). */
export function buildSummary(rows: NotificationRow[], unread: number): NotificationSummary {
  return {
    notifications: rows.map(toNotificationDto),
    unread_count: Math.max(0, unread),
  };
}

/** Pure: minimal HTML escape for the optional email body (our own content, escaped defensively). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const DEFAULT_LIMIT = 30;

/** Recent notifications for a user + total unread count — the bell's `GET /me` payload. */
export async function listForUser(
  userId: string,
  opts: { limit?: number } = {},
): Promise<NotificationSummary> {
  const [rows, unread] = await Promise.all([
    prisma.lmsNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? DEFAULT_LIMIT,
    }),
    prisma.lmsNotification.count({ where: { userId, readAt: null } }),
  ]);
  return buildSummary(rows, unread);
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.lmsNotification.count({ where: { userId, readAt: null } });
}

export type CreateNotificationInput = {
  userId: string;
  /** 'toolbox_talk' | 'recert_due' | 'system' | … */
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  /** Unique idempotency key (type + subject + period + user) — never creates a second row. */
  dedupeKey: string;
  /** When true and email is configured, also email the user (best-effort, only on fresh create). */
  email?: boolean;
};

/**
 * Idempotent create keyed on `dedupeKey`. If a row already exists it is returned unchanged and no
 * email is sent, so crons can re-run safely. Returns `{ created }` so callers know whether a fresh
 * notification (and email) fired.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.lmsNotification.findUnique({
    where: { dedupeKey: input.dedupeKey },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  try {
    const row = await prisma.lmsNotification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
        dedupeKey: input.dedupeKey,
      },
      select: { id: true },
    });
    if (input.email) await dispatchEmail(input).catch((e) => {
      console.error('[notifications] email dispatch failed', e);
    });
    return { id: row.id, created: true };
  } catch (e) {
    // A concurrent create won the unique(dedupe_key) race — treat as already-existing (idempotent).
    const raced = await prisma.lmsNotification.findUnique({
      where: { dedupeKey: input.dedupeKey },
      select: { id: true },
    });
    if (raced) return { id: raced.id, created: false };
    throw e;
  }
}

/** Mark one notification read — scoped to the owner so a user cannot read another's row. */
export async function markRead(id: string, userId: string): Promise<void> {
  await prisma.lmsNotification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.lmsNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

async function dispatchEmail(input: CreateNotificationInput): Promise<void> {
  if (!isEmailConfigured()) return;
  const user = await prisma.lmsUser.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (!user?.email) return;
  const link = input.linkUrl
    ? `<p><a href="${escapeHtml(input.linkUrl)}">View in CARSI</a></p>`
    : '';
  await sendEmail({
    to: user.email,
    subject: input.title,
    html: `<p>${escapeHtml(input.body)}</p>${link}`,
    text: input.linkUrl ? `${input.body}\n\n${input.linkUrl}` : input.body,
  });
}
