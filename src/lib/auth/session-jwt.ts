import { SignJWT, jwtVerify } from 'jose';

import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';

export interface SessionClaims {
  sub: string;
  email: string;
  full_name: string;
  role: string;
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({
    email: claims.email,
    full_name: claims.full_name,
    role: claims.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSessionSecretBytes());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretBytes());
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const full_name = typeof payload.full_name === 'string' ? payload.full_name : 'User';
    const role = typeof payload.role === 'string' ? payload.role : 'student';
    if (!sub || !email) return null;
    return { sub, email, full_name, role };
  } catch {
    return null;
  }
}

export async function signPasswordResetToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getSessionSecretBytes());
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretBytes());
    if (payload.purpose !== 'password_reset') return null;
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    return sub || null;
  } catch {
    return null;
  }
}

const PROOF_PACK_SHARE_AUDIENCE = 'carsi-proof-pack-share';

/** Time-limited link for employer-facing training / CEC summary (no session cookie required). */
export async function signProofPackShareToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: 'proof_pack_share' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience(PROOF_PACK_SHARE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSessionSecretBytes());
}

export async function verifyProofPackShareToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretBytes(), {
      audience: PROOF_PACK_SHARE_AUDIENCE,
    });
    if (payload.purpose !== 'proof_pack_share') return null;
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    return sub || null;
  } catch {
    return null;
  }
}

const EMAIL_UNSUBSCRIBE_AUDIENCE = 'carsi-email-unsubscribe';

/**
 * One-click unsubscribe token embedded in marketing/drip emails. Intentionally
 * has NO expiry — an unsubscribe facility must stay functional indefinitely
 * (Spam Act 2003 s.18: a functional unsubscribe for the life of the address).
 */
export async function signEmailUnsubscribeToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: 'email_unsubscribe' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience(EMAIL_UNSUBSCRIBE_AUDIENCE)
    .setIssuedAt()
    .sign(getSessionSecretBytes());
}

export async function verifyEmailUnsubscribeToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretBytes(), {
      audience: EMAIL_UNSUBSCRIBE_AUDIENCE,
    });
    if (payload.purpose !== 'email_unsubscribe') return null;
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    return sub || null;
  } catch {
    return null;
  }
}
