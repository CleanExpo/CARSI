import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/prisma';

const publishedWhere = {
  OR: [
    { isPublished: true },
    { status: { equals: 'published', mode: 'insensitive' as const } },
  ],
};

const MAX_CONTEXT_CHARS = 14_000;

/**
 * Plain-text catalog snippet for the public chat assistant (OpenAI system context).
 * Cached briefly to avoid hammering Postgres on every chat message.
 */
export async function getAssistantCourseContextText(): Promise<string> {
  if (!process.env.DATABASE_URL?.trim()) {
    return 'No course database is configured. Direct users to carsi.com.au/courses for the public catalogue.';
  }

  const cached = unstable_cache(
    async () => {
      const rows = await prisma.lmsCourse.findMany({
        where: publishedWhere,
        orderBy: { updatedAt: 'desc' },
        take: 250,
        select: {
          slug: true,
          title: true,
          shortDescription: true,
          category: true,
          iicrcDiscipline: true,
          priceAud: true,
          isFree: true,
          _count: { select: { modules: true } },
        },
      });

      if (rows.length === 0) {
        return 'There are currently no published courses in the database.';
      }

      const lines = rows.map((r) => {
        const price =
          r.isFree || Number(r.priceAud) <= 0 ? 'Free' : `AUD ${Number(r.priceAud).toFixed(2)}`;
        const cat = r.category?.trim() || 'General';
        const disc = r.iicrcDiscipline?.trim() || '—';
        const short = r.shortDescription?.replace(/\s+/g, ' ').trim().slice(0, 220) || '';
        return `- slug:${r.slug} | ${r.title} | ${price} | ${cat} | IICRC:${disc} | modules:${r._count.modules}${short ? ` | ${short}` : ''}`;
      });

      let text = `Published CARSI catalogue (${rows.length} courses). Use only this list for course titles, prices, categories, and slugs. If a course is not listed, say you are not sure and suggest browsing /courses.\n\n${lines.join('\n')}`;
      if (text.length > MAX_CONTEXT_CHARS) {
        text = `${text.slice(0, MAX_CONTEXT_CHARS)}\n…(truncated)`;
      }
      return text;
    },
    ['ai-assistant-course-context-v2'],
    { revalidate: 120, tags: ['lms-courses-public'] }
  );

  return cached();
}

export function getAssistantDisplayName(): string {
  return (
    process.env.NEXT_PUBLIC_AI_ASSISTANT_NAME?.trim() ||
    process.env.AI_ASSISTANT_NAME?.trim() ||
    'Claire'
  );
}

export function getAssistantTagline(): string {
  return (
    process.env.NEXT_PUBLIC_AI_ASSISTANT_TAGLINE?.trim() ||
    'Your CARSI professional learning guide'
  );
}
