import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), createMany: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: {
  margotMessage: { findMany: db.findMany },
  margotConversation: { findUnique: db.findUnique },
  $transaction: async (callback: (tx: unknown) => unknown) => callback({
    margotConversation: { upsert: db.upsert }, margotMessage: { createMany: db.createMany },
  }),
} }));
import { signAnonymousConversation } from './margot-conversation-access';
import { loadMargotHistory, appendMargotTurn, appendMargotUserTurn } from './margot-conversation-store';

describe('Margot conversation ownership', () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgresql://synthetic-test-only');
    db.findMany.mockImplementation(async (query) =>
      query.where.conversation?.userId === 'other-user' ? [] : [{ role: 'user', content: 'private transcript' }]);
    db.upsert.mockResolvedValue({ id: 'conversation' });
  });
  it('does not disclose another user history through the store', async () => {
    expect(await loadMargotHistory('conversation', { userId: 'other-user' })).toEqual([]);
  });
  it('allows an owner to resume', async () => {
    expect(await loadMargotHistory('conversation', { userId: 'owner' })).toEqual([{ role: 'user', content: 'private transcript' }]);
  });
  it('rejects anonymous reads and writes without proof before touching the database', async () => {
    const access = { userId: null, anonymousToken: '' } as const;
    await expect(loadMargotHistory('conversation', access)).rejects.toThrow('Conversation access denied');
    await expect(appendMargotTurn({ conversationId: 'conversation', access, userMessage: 'x', assistantMessage: 'y' })).rejects.toThrow();
    expect(db.findMany).not.toHaveBeenCalled();
    expect(db.upsert).not.toHaveBeenCalled();
  });
  it('scopes legitimate anonymous resume to unowned records', async () => {
    vi.stubEnv('JWT_SECRET', 'synthetic-secret-at-least-32-characters');
    const token = await signAnonymousConversation('conversation');
    await loadMargotHistory('conversation', { userId: null, anonymousToken: token });
    expect(db.findMany.mock.calls[0][0].where).toEqual({ conversationId: 'conversation', conversation: { userId: null } });
  });
  it('does not append messages if an atomic ownership-constrained upsert loses a race', async () => {
    db.upsert.mockRejectedValueOnce(new Error('unique owner conflict'));
    await expect(appendMargotTurn({ conversationId: 'conversation', access: { userId: 'other-user' },
      userMessage: 'x', assistantMessage: 'y' })).rejects.toThrow();
    expect(db.createMany).not.toHaveBeenCalled();
  });
  it('reserves a first user message and does not duplicate it in the assistant turn', async () => {
    const params = { conversationId: 'conversation', access: { userId: 'owner' }, userMessage: 'Hello' };
    await appendMargotUserTurn(params);
    expect(db.createMany.mock.calls[0][0].data).toEqual([{ conversationId: 'conversation', role: 'user', content: 'Hello' }]);
    await appendMargotTurn({ ...params, assistantMessage: 'Hi', userMessageAlreadyStored: true });
    expect(db.createMany.mock.calls[1][0].data).toEqual([{ conversationId: 'conversation', role: 'assistant', content: 'Hi', model: null }]);
  });
  it('never changes the owner when appending a turn', async () => {
    await appendMargotTurn({ conversationId: 'conversation', userMessage: 'Hello', assistantMessage: 'Hi',
      access: { userId: 'owner' }, meta: { userId: 'owner' } });
    expect(db.upsert.mock.calls[0][0].update).not.toHaveProperty('userId');
    expect(db.upsert.mock.calls[0][0].where).toMatchObject({ id: 'conversation', userId: 'owner' });
  });
});
