import { SignJWT, jwtVerify } from 'jose';

/**
 * Password-gated access token for /ccw-materials.
 *
 * Separate from the main LMS session JWT so rotating the CCW cookie secret
 * does not invalidate learner logins (and vice versa). Intended for a single
 * site-wide shared password distributed at the 2-day CCW workshop.
 */

export const CCW_COOKIE_NAME = 'ccw_access';
export const CCW_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const CCW_TOKEN_PURPOSE = 'ccw-materials';

function getSecret(): Uint8Array {
  const secret =
    process.env.CCW_COOKIE_SECRET ||
    process.env.JWT_SECRET ||
    'development-only-ccw-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

export async function signCcwAccessToken(): Promise<string> {
  return new SignJWT({ purpose: CCW_TOKEN_PURPOSE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${CCW_COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyCcwAccessToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.purpose === CCW_TOKEN_PURPOSE;
  } catch {
    return false;
  }
}

/**
 * Constant-time comparison that never short-circuits on length mismatch.
 * Uses byte-wise XOR accumulation so timing cannot leak either the attempted
 * password or the expected password.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  const len = Math.max(aBuf.length, bBuf.length);
  let diff = aBuf.length ^ bBuf.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0);
  }
  return diff === 0;
}
