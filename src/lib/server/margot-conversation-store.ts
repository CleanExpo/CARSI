import { prisma } from '@/lib/prisma';
import { conversationOwner, type ConversationAccess } from './margot-conversation-access';

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

export async function loadMargotHistory(conversationId: string, access: ConversationAccess): Promise<MargotTurn[]> {
  const userId = await conversationOwner(conversationId, access);
  if (!dbEnabled()) return [];

  const rows = await prisma.margotMessage.findMany({
    where: { conversationId, conversation: { userId } },
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

type MargotWriteParams = {
  conversationId: string;
  access: ConversationAccess;
  meta?: MargotConversationMeta;
};

/** Reserve the first user entry and immutable ownership before exposing its ID. */
export async function appendMargotUserTurn(params: MargotWriteParams & { userMessage: string }): Promise<void> {
  const content = cleanContent(params.userMessage);
  if (!content) throw new Error('Empty user message');
  await persistMargotMessages(params, [{ role: 'user', content }]);
}

export async function appendMargotTurn(params: MargotWriteParams & {
  userMessage: string;
  assistantMessage: string;
  model?: string | null;
  userMessageAlreadyStored?: boolean;
}): Promise<void> {
  const userContent = cleanContent(params.userMessage);
  const assistantContent = cleanContent(params.assistantMessage);
  if (!userContent || !assistantContent) return;
  const messages = params.userMessageAlreadyStored ? [] : [{ role: 'user', content: userContent }];
  await persistMargotMessages(params, [...messages, {
    role: 'assistant', content: assistantContent, model: params.model ?? null,
  }]);
}

async function persistMargotMessages(
  params: MargotWriteParams,
  messages: Array<{ role: string; content: string; model?: string | null }>,
): Promise<void> {
  const userId = await conversationOwner(params.conversationId, params.access);
  if (!dbEnabled()) return;
  await prisma.$transaction(async (tx) => {
    await tx.margotConversation.upsert({
      where: { id: params.conversationId, userId },
      create: {
        id: params.conversationId, userId,
        sourceIp: params.meta?.sourceIp ?? null,
        pagePath: params.meta?.pagePath ?? null,
        courseSlug: params.meta?.courseSlug ?? null,
        lessonId: params.meta?.lessonId ?? null,
      },
      update: {
        updatedAt: new Date(),
        pagePath: params.meta?.pagePath ?? undefined,
        courseSlug: params.meta?.courseSlug ?? undefined,
        lessonId: params.meta?.lessonId ?? undefined,
      },
    });
    await tx.margotMessage.createMany({
      data: messages.map((message) => ({ ...message, conversationId: params.conversationId })),
    });
  });
}

export async function margotConversationExists(conversationId: string, access: ConversationAccess): Promise<boolean> {
  const userId = await conversationOwner(conversationId, access);
  if (!dbEnabled()) return false;
  const row = await prisma.margotConversation.findUnique({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  return Boolean(row);
}
