import { describe, expect, it } from 'vitest';

// @ts-expect-error — pure .mjs core shared with scripts/check-secrets.mjs
import { findSecretToken } from '../../../scripts/secret-scan-core.mjs';

/**
 * WS5 — the secret-scan core backs a required CI gate, so pin its behaviour.
 *
 * IMPORTANT: key fixtures are BUILT AT RUNTIME (never written as literals). A
 * literal like `sk_live_<real-looking key>` would trip GitHub push-protection AND
 * this very scanner when it scans the committed tree — so the tests would block
 * their own commit. Concatenation keeps the source clean while the runtime value
 * still exercises the regex.
 */
const U = '_';
const ALNUM = 'a1B2c3D4e5F6g7H8i9J0kLmNoPqRsT'; // 30 alphanumerics, no key prefix

function makeKey(prefix: string, infix?: 'live' | 'test', bodyLen = 24): string {
  const body = ALNUM.slice(0, bodyLen);
  return infix ? prefix + U + infix + U + body : prefix + U + body;
}

describe('findSecretToken — detects real secrets', () => {
  it('flags secret-prefixed tokens (sk_live_ / rk_test_ / whsec_ / ck_)', () => {
    expect(findSecretToken('const k = "' + makeKey('sk', 'live') + '";')).not.toBeNull();
    expect(findSecretToken('RK=' + makeKey('rk', 'test'))).not.toBeNull();
    expect(findSecretToken('WEBHOOK=' + makeKey('whsec'))).not.toBeNull();
    expect(findSecretToken('WOO=' + makeKey('ck'))).not.toBeNull();
  });

  it('detects a real key even when the line ALSO contains ... / ${…} / example (the whole-line bug)', () => {
    const k = makeKey('sk', 'live');
    expect(findSecretToken('key: "' + k + '", // ...more')).not.toBeNull();
    expect(findSecretToken('const u = `${base}?k=' + k + '`')).not.toBeNull();
    expect(findSecretToken(k + ' // example only')).not.toBeNull();
  });
});

describe('findSecretToken — ignores non-secrets / placeholders', () => {
  it('ignores the PUBLIC pk_ (publishable) and cs_ (checkout-session) prefixes', () => {
    expect(findSecretToken('PUBLISHABLE=' + makeKey('pk', 'live'))).toBeNull();
    expect(findSecretToken('SESSION=' + makeKey('cs', 'test'))).toBeNull();
  });

  it('ignores placeholder-shaped tokens and too-short tokens', () => {
    expect(findSecretToken('EXAMPLE=' + 'ck' + U + 'x'.repeat(18))).toBeNull();
    expect(findSecretToken('SECRET=' + makeKey('sk', 'test', 8))).toBeNull(); // < 16 chars
    expect(findSecretToken('a normal line with no key')).toBeNull();
  });
});
