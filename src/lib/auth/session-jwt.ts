import { SignJWT, jwtVerify } from 'jose';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'development-only-change-jwt-secret-in-production'
  );
}

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
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
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
    .sign(getSecret());
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== 'password_reset') return null;
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    return sub || null;
  } catch {
    return null;
  }
}
