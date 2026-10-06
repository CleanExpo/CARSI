import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const fixtures = vi.hoisted(() => ({
  access: vi.fn(), create: vi.fn(), exists: vi.fn(), history: vi.fn(), append: vi.fn(),
  chat: vi.fn(), stream: vi.fn(), streaming: vi.fn(),
}));
vi.mock('./margot-conversation-access', () => ({
  requestConversationAccess: fixtures.access, newConversationAccess: fixtures.create,
  withConversationCookie: (response: Response) => response,
}));
vi.mock('./margot-conversation-store', () => ({ margotConversationExists: fixtures.exists,
  loadMargotHistory: fixtures.history, appendMargotTurn: fixtures.append }));
vi.mock('@/lib/rate-limit', () => ({ applyRateLimit: () => ({ ok: true }), clientIpFrom: () => 'test' }));
vi.mock('@/lib/openrouter/provider', () => ({ resolveOpenRouterConfig: () => ({ apiKey: 'synthetic', configured: true, model: 'test' }) }));
vi.mock('@/lib/openrouter/client', () => ({
  OpenRouterAPIError: class extends Error {},
  OpenRouterClient: class { chat = fixtures.chat; static extractText() { return 'Hello'; } },
}));
vi.mock('./ai-assistant-context', () => ({ getAssistantCourseContextText: async () => '',
  getAssistantDisplayName: () => 'Margot', getAssistantScopeLock: () => '', getAssistantTagline: () => '',
  getAssistantPageFocusContext: async () => null }));
vi.mock('./assistant-prompt', () => ({ buildAssistantSystemPrompt: () => '' }));
vi.mock('./margot-knowledge-base', () => ({ getMargotKnowledgeBaseContext: () => '' }));
vi.mock('./margot-streaming-flag', () => ({ margotStreamingEnabled: fixtures.streaming }));
vi.mock('./margot-write-tools-flag', () => ({ margotWriteToolsEnabled: () => false }));
vi.mock('./frontdesk/stream', () => ({ runFrontDeskStream: fixtures.stream }));
import { POST } from '../../../app/api/margot/chat/route';
import { GET } from '../../../app/api/margot/chat/history/route';
const ID = '10000000-0000-4000-8000-000000000001';
const access = { userId: 'owner' };
function post(id: string | null = ID) { return new NextRequest('http://localhost/api/margot/chat', {
  method: 'POST', body: JSON.stringify({ message: 'Hello', conversation_id: id }),
}); }
describe('Margot route access gates', () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('DATABASE_URL', 'postgresql://synthetic-test');
    fixtures.access.mockResolvedValue(access); fixtures.exists.mockResolvedValue(true);
    fixtures.history.mockResolvedValue([]); fixtures.append.mockResolvedValue(undefined);
    fixtures.chat.mockResolvedValue({}); fixtures.streaming.mockReturnValue(false);
    fixtures.stream.mockImplementation(async function* () { yield 'Hello'; });
    fixtures.create.mockResolvedValue({ id: ID, access });
  });
  it('rejects missing proof before history reads', async () => {
    fixtures.access.mockResolvedValue(null);
    const response = await GET(new NextRequest(`http://localhost/api/margot/chat/history?conversation_id=${ID}`));
    expect(response.status).toBe(403); expect(fixtures.history).not.toHaveBeenCalled();
  });
  it.each([false, true])('rejects another owner before inference and writes (streaming=%s)', async (streaming) => {
    fixtures.streaming.mockReturnValue(streaming); fixtures.exists.mockResolvedValue(false);
    expect((await POST(post())).status).toBe(403);
    expect(fixtures.history).not.toHaveBeenCalled(); expect(fixtures.chat).not.toHaveBeenCalled();
    expect(fixtures.stream).not.toHaveBeenCalled(); expect(fixtures.append).not.toHaveBeenCalled();
  });
  it('resumes history with owner-scoped store access', async () => {
    const response = await GET(new NextRequest(`http://localhost/api/margot/chat/history?conversation_id=${ID}`));
    expect(response.status).toBe(200); expect(fixtures.history).toHaveBeenCalledWith(ID, access);
  });
  it.each([false, true])('passes authorised access to persistence (streaming=%s)', async (streaming) => {
    fixtures.streaming.mockReturnValue(streaming);
    const response = await POST(post()); await response.text();
    expect(response.status).toBe(200);
    expect(fixtures.append).toHaveBeenCalledWith(expect.objectContaining({ conversationId: ID, access }));
  });
  it('uses a server ID for a fresh conversation', async () => {
    expect((await POST(post(null))).status).toBe(200);
    expect(fixtures.create).toHaveBeenCalled(); expect(fixtures.access).not.toHaveBeenCalled();
  });
});
