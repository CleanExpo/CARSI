import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';
import { getSessionClaimsFromRequest } from './auth-from-request';

const COOKIE = 'margot_conversation';
const AUDIENCE = 'carsi-margot-conversation';
const MAX_AGE = 7 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ConversationAccess =
  | { userId: string }
  | { userId: null; anonymousToken: string };

function signingKey(): Uint8Array {
  // Never use the development fallback for a private transcript capability.
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Margot conversation signing is not configured');
  }
  return getSessionSecretBytes();
}

export async function signAnonymousConversation(conversationId: string): Promise<string> {
  return new SignJWT({ purpose: 'margot_conversation' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(conversationId)
    .setAudience(AUDIENCE).setIssuedAt().setExpirationTime('7d').sign(signingKey());
}

export async function conversationOwner(
  conversationId: string, access: ConversationAccess,
): Promise<string | null> {
  if (access.userId !== null) {
    if (!access.userId) throw new Error('Conversation access denied');
    return access.userId;
  }
  try {
    const { payload } = await jwtVerify(access.anonymousToken, signingKey(), {
      audience: AUDIENCE, algorithms: ['HS256'],
    });
    if (payload.purpose === 'margot_conversation' && payload.sub === conversationId) return null;
  } catch { /* Invalid or unavailable capabilities must not disclose transcripts. */ }
  throw new Error('Conversation access denied');
}

export async function requestConversationAccess(request: NextRequest, id: string) {
  if (!UUID.test(id)) return null;
  const claims = await getSessionClaimsFromRequest(request);
  if (claims?.sub) return { userId: claims.sub } satisfies ConversationAccess;
  const access: ConversationAccess = {
    userId: null, anonymousToken: request.cookies.get(COOKIE)?.value ?? '',
  };
  try { await conversationOwner(id, access); return access; } catch { return null; }
}

export async function newConversationAccess(request: NextRequest) {
  const id = randomUUID();
  const claims = await getSessionClaimsFromRequest(request);
  if (claims?.sub) return { id, access: { userId: claims.sub } as ConversationAccess };
  const token = await signAnonymousConversation(id);
  return { id, access: { userId: null, anonymousToken: token } as ConversationAccess, token };
}

export function withConversationCookie(response: Response, token?: string): Response {
  if (token) {
    const cookieResponse = new NextResponse();
    cookieResponse.cookies.set(COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', path: '/api/margot/chat', maxAge: MAX_AGE,
    });
    response.headers.append('Set-Cookie', cookieResponse.headers.get('Set-Cookie')!);
  }
  return response;
}
