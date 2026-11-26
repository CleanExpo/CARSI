import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * GP-783: every Stripe Checkout Session CARSI opens carries an idempotency key built by the one
 * owner, `src/lib/server/checkout-idempotency.ts`. A new checkout that sends no key, or builds its
 * own, fails here. Creators not yet keyed are listed by name with the card that will key them;
 * the list may only shrink.
 */

const ROOT = join(__dirname, '..', '..', '..');
const OWNER = join('src', 'lib', 'server', 'checkout-idempotency.ts');

/**
 * Creators not yet keyed. Empty since GP-785 keyed the coaching and one-off onboarding checkouts
 * and removed the unused generic wrapper. It may only stay empty.
 */
const NOT_YET_KEYED: Record<string, string> = {};

const KEY_BUILDERS =
  /idempotencyKey:\s*(courseCheckoutIdempotencyKey|checkoutRequestIdempotencyKey|checkoutSessionIdempotencyKey)\(/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'generated' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const FILES = [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'src'))].map((f) => ({
  path: relative(ROOT, f),
  text: readFileSync(f, 'utf8'),
}));

/** The argument text of every `checkout.sessions.create(...)` call in `text`. */
function checkoutCreateCalls(text: string): string[] {
  const calls: string[] = [];
  const pattern = /checkout\.sessions\.create\(/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    let depth = 1;
    let i = match.index + match[0].length;
    for (; i < text.length && depth > 0; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') depth--;
    }
    calls.push(text.slice(match.index + match[0].length, i - 1));
  }
  return calls;
}

/** `path` for every create call in the tree that does not take its key from the owner. */
function unkeyedCreators(files: { path: string; text: string }[]): string[] {
  return files.flatMap((f) =>
    checkoutCreateCalls(f.text)
      .filter((args) => !KEY_BUILDERS.test(args))
      .map(() => f.path)
  );
}

describe('GP-783: every Stripe checkout key comes from checkout-idempotency.ts', () => {
  it('control: the scan sees the tree, the owner and the keyed course checkout', () => {
    expect(FILES.length).toBeGreaterThan(100);
    const owner = FILES.find((f) => f.path === OWNER)?.text ?? '';
    expect(owner).toMatch(/export function courseCheckoutIdempotencyKey\(/);
    expect(owner).toMatch(/export function checkoutSessionIdempotencyKey\(/);
    const course = FILES.find(
      (f) => f.path === join('src', 'lib', 'server', 'local-course-checkout.ts')
    );
    expect(checkoutCreateCalls(course?.text ?? '')).toHaveLength(1);
  });

  it('control: an unkeyed create and a hand-made key are both caught', () => {
    const planted = [
      {
        path: 'planted/no-key.ts',
        text: 'await stripe.checkout.sessions.create({ mode: "payment" });',
      },
      {
        path: 'planted/own-key.ts',
        text: 'await stripe.checkout.sessions.create(req, { idempotencyKey: `mine:${id}` });',
      },
      {
        path: 'planted/keyed.ts',
        text: 'await stripe.checkout.sessions.create(req, { idempotencyKey: courseCheckoutIdempotencyKey(req) });',
      },
    ];
    expect(unkeyedCreators(planted)).toEqual(['planted/no-key.ts', 'planted/own-key.ts']);
  });

  it('every checkout create outside the named not-yet-keyed list takes its key from the owner', () => {
    const offenders = unkeyedCreators(FILES).filter((p) => !(p in NOT_YET_KEYED));
    expect(offenders).toEqual([]);
  });

  it('the not-yet-keyed list holds only creators that are still unkeyed (it may only shrink)', () => {
    const stillUnkeyed = new Set(unkeyedCreators(FILES));
    expect(Object.keys(NOT_YET_KEYED).filter((p) => !stillUnkeyed.has(p))).toEqual([]);
  });

  it('no file other than the owner builds a Stripe checkout key from a hash of its own', () => {
    const builders = FILES.filter(
      (f) => f.path !== OWNER && /export function \w*IdempotencyKey\(/.test(f.text)
    ).map((f) => f.path);
    expect(builders).toEqual([]);
  });
});
