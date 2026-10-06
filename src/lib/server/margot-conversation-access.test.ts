import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
const auth = vi.hoisted(() => ({ claims: vi.fn() }));
vi.mock('./auth-from-request', () => ({ getSessionClaimsFromRequest: auth.claims }));
import { conversationOwner, newConversationAccess, requestConversationAccess,
  signAnonymousConversation, withConversationCookie } from './margot-conversation-access';

const ID = '10000000-0000-4000-8000-000000000001';
const OTHER = '10000000-0000-4000-8000-000000000002';
const SECRET = 'synthetic-test-secret-with-at-least-32-characters';
const original = process.env.JWT_SECRET;
function request(token = '') {
  return new NextRequest('http://localhost/api/margot/chat', { headers: { cookie: `margot_conversation=${token}` } });
}
describe('conversation capability', () => {
  beforeEach(() => { process.env.JWT_SECRET = SECRET; auth.claims.mockResolvedValue(null); });
  afterEach(() => { if (original === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original; });
  it('resumes an anonymous conversation only with its signed capability', async () => {
    const token = await signAnonymousConversation(ID);
    expect(await requestConversationAccess(request(token), ID)).toEqual({ userId: null, anonymousToken: token });
    expect(await requestConversationAccess(request(token), OTHER)).toBeNull();
    expect(await requestConversationAccess(request(), ID)).toBeNull();
    expect(await requestConversationAccess(request(`${token}x`), ID)).toBeNull();
  });
  it('rejects expired and unrelated-purpose JWTs', async () => {
    const key = new TextEncoder().encode(SECRET);
    const expired = await new SignJWT({ purpose: 'margot_conversation' }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(ID).setAudience('carsi-margot-conversation').setExpirationTime(1).sign(key);
    const wrong = await new SignJWT({ purpose: 'password_reset' }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(ID).setAudience('carsi-margot-conversation').setExpirationTime('1h').sign(key);
    expect(await requestConversationAccess(request(expired), ID)).toBeNull();
    expect(await requestConversationAccess(request(wrong), ID)).toBeNull();
  });
  it('uses verified account identity instead of an anonymous cookie after login', async () => {
    auth.claims.mockResolvedValue({ sub: 'owner' });
    expect(await requestConversationAccess(request(), ID)).toEqual({ userId: 'owner' });
    expect(await conversationOwner(ID, { userId: 'owner' })).toBe('owner');
  });
  it('creates a server ID and an HttpOnly scoped cookie for anonymous chat', async () => {
    const context = await newConversationAccess(request());
    expect(context.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await conversationOwner(context.id, context.access)).toBeNull();
    const response = withConversationCookie(new Response('ok'), context.token);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=strict');
    expect(response.headers.get('set-cookie')).toContain('Path=/api/margot/chat');
  });
  it('fails closed without a strong signing secret even outside production', async () => {
    delete process.env.JWT_SECRET;
    await expect(newConversationAccess(request())).rejects.toThrow();
    expect(await requestConversationAccess(request('invalid'), ID)).toBeNull();
  });
});
