import { prisma } from '@/lib/prisma';

import { MAX_MARKETING_RECIPIENTS } from './admin-marketing-email';

export const MARKETING_LIST_PAGE_SIZES = [25, 50, 80] as const;
export type MarketingListPageSize = (typeof MARKETING_LIST_PAGE_SIZES)[number];

export function parseMarketingListPageSize(raw: string | null): MarketingListPageSize {
  const n = Number.parseInt(raw ?? '', 10);
  return (MARKETING_LIST_PAGE_SIZES as readonly number[]).includes(n)
    ? (n as MarketingListPageSize)
    : 25;
}

export function marketingUserWhere(q: string) {
  const term = q.trim();
  return {
    isActive: true,
    emailOptOut: false,
    ...(term.length >= 3
      ? {
          OR: [
            { email: { contains: term, mode: 'insensitive' as const } },
            { fullName: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
}

export async function listMarketingRecipients(opts: {
  q: string;
  page: number;
  pageSize: MarketingListPageSize;
}) {
  const where = marketingUserWhere(opts.q);
  const page = Math.max(1, opts.page);
  const skip = (page - 1) * opts.pageSize;

  const [total, users] = await Promise.all([
    prisma.lmsUser.count({ where }),
    prisma.lmsUser.findMany({
      where,
      select: { id: true, email: true, fullName: true },
      orderBy: { email: 'asc' },
      skip,
      take: opts.pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / opts.pageSize));
  return {
    users,
    total,
    page,
    pageSize: opts.pageSize,
    totalPages,
    cappedSelectAll: Math.min(total, MAX_MARKETING_RECIPIENTS),
  };
}

export async function listMarketingRecipientIdsForSelectAll(q: string) {
  const where = marketingUserWhere(q);
  const users = await prisma.lmsUser.findMany({
    where,
    select: { id: true, email: true, fullName: true },
    orderBy: { email: 'asc' },
    take: MAX_MARKETING_RECIPIENTS,
  });
  const total = await prisma.lmsUser.count({ where });
  return { users, total };
}
