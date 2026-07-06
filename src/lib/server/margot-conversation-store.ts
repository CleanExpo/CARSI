import { prisma } from '@/lib/prisma';

export type MargotTurn = { role: 'user' | 'assistant'; content: string };

export type MargotConversationMeta = {
  userId?: string | null;
  sourceIp?: string | null;
  pagePath?: string | null;
  courseSlug?: string | null;
  lessonId?: string | null;
};

const MAX_STORED_MESSAGE_LEN = 4_000;
const MAX_HISTORY_LOAD = 24;

function dbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function cleanContent(content: string): string {
  return content.trim().slice(0, MAX_STORED_MESSAGE_LEN);
}

export async function loadMargotHistory(conversationId: string): Promise<MargotTurn[]> {
  if (!dbEnabled()) return [];

  const rows = await prisma.margotMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: MAX_HISTORY_LOAD,
    select: { role: true, content: true },
  });

  return rows
    .filter((r) => r.role === 'user' || r.role === 'assistant')
    .map((r) => ({
      role: r.role as 'user' | 'assistant',
      content: r.content,
    }));
}

export async function appendMargotTurn(params: {
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
  model?: string | null;
  meta?: MargotConversationMeta;
}): Promise<void> {
  if (!dbEnabled()) return;

  const userContent = cleanContent(params.userMessage);
  const assistantContent = cleanContent(params.assistantMessage);
  if (!userContent || !assistantContent) return;

  await prisma.$transaction(async (tx) => {
    await tx.margotConversation.upsert({
      where: { id: params.conversationId },
      create: {
        id: params.conversationId,
        userId: params.meta?.userId ?? null,
        sourceIp: params.meta?.sourceIp ?? null,
        pagePath: params.meta?.pagePath ?? null,
        courseSlug: params.meta?.courseSlug ?? null,
        lessonId: params.meta?.lessonId ?? null,
      },
      update: {
        updatedAt: new Date(),
        userId: params.meta?.userId ?? undefined,
        pagePath: params.meta?.pagePath ?? undefined,
        courseSlug: params.meta?.courseSlug ?? undefined,
        lessonId: params.meta?.lessonId ?? undefined,
      },
    });

    await tx.margotMessage.createMany({
      data: [
        {
          conversationId: params.conversationId,
          role: 'user',
          content: userContent,
        },
        {
          conversationId: params.conversationId,
          role: 'assistant',
          content: assistantContent,
          model: params.model ?? null,
        },
      ],
    });
  });
}

export async function margotConversationExists(conversationId: string): Promise<boolean> {
  if (!dbEnabled()) return false;
  const row = await prisma.margotConversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });
  return Boolean(row);
}
