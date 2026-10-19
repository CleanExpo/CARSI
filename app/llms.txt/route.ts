import { prisma } from '@/lib/prisma';
import { llmsTxtResponse } from '@/lib/server/llms-txt-response';
import {
  getPublishedCourseListItemsFromDatabase,
  lmsPublishedCourseWhere,
} from '@/lib/server/public-courses-list';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

// Built per request from the live catalogue, pricing tier and CEC registry
// (src/lib/seo/llms-txt.ts). Replaces the hand-maintained public/llms.txt.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return llmsTxtResponse({
    readCatalogue: async () => {
      if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is not set');
      const [items, count] = await Promise.all([
        getPublishedCourseListItemsFromDatabase(),
        prisma.lmsCourse.count({ where: lmsPublishedCourseWhere }),
      ]);
      return { items, count };
    },
    subscriptionsEnabled,
  });
}
