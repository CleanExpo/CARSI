import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * GP-783: every Stripe Checkout Session CARSI opens carries an idempotency key built by the one
 * owner, `src/lib/server/checkout-idempotency.ts`. A new checkout that sends no key, or builds its
 * own, fails here. Creators not yet keyed are listed by name with the card that will key them;
 * the list may only shrink.
 */

const ROOT = join(__dirname, '..', '..', '..');
const OWNER = join('src', 'lib', 'server', 'checkout-idempotency.ts');

/** Not "Buy course"; keyed under GP-785. Remove an entry when its creator is keyed. */
const NOT_YET_KEYED: Record<string, string> = {
  [join('src', 'lib', 'server', 'business-coaching-checkout.ts')]:
    'GP-785: event business coaching',
  [join('src', 'lib', 'server', 'carsi-coaching-monthly-checkout.ts')]: 'GP-785: monthly coaching',
  [join('src', 'lib', 'server', 'onboarding-checkout.ts')]: 'GP-785: one-off onboarding',
  [join('src', 'lib', 'api', 'stripe.ts')]: 'GP-785: generic wrapper with no production caller',
};

/** The owner's key builders: the only calls a create may take its key from. */
const KEY_BUILDERS = new Set(['courseCheckoutIdempotencyKey', 'checkoutSessionIdempotencyKey']);

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

/** Whether `call` is a `<something>.checkout.sessions.create(...)` call. */
function isCheckoutCreate(call: ts.CallExpression): boolean {
  const create = call.expression;
  if (!ts.isPropertyAccessExpression(create) || create.name.text !== 'create') return false;
  const sessions = create.expression;
  if (!ts.isPropertyAccessExpression(sessions) || sessions.name.text !== 'sessions') return false;
  // `stripe.checkout.sessions.create(...)`, or `checkout.sessions.create(...)` after
  // `const { checkout } = stripe`.
  const checkout = sessions.expression;
  if (ts.isIdentifier(checkout)) return checkout.text === 'checkout';
  return ts.isPropertyAccessExpression(checkout) && checkout.name.text === 'checkout';
}

/**
 * Whether the create call sends the owner's key: its second argument (Stripe's request options)
 * is an object literal with a top-level `idempotencyKey` whose value is a call to one of the
 * owner's builders. Read from the parsed source (GP-789), so a key named only in a comment, or
 * nested in the request data or deeper in the options, does not count: Stripe would get no key.
 */
function sendsOwnerKey(call: ts.CallExpression): boolean {
  const options = call.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return false;
  return options.properties.some(
    (p) =>
      ts.isPropertyAssignment(p) &&
      (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
      p.name.text === 'idempotencyKey' &&
      ts.isCallExpression(p.initializer) &&
      ts.isIdentifier(p.initializer.expression) &&
      KEY_BUILDERS.has(p.initializer.expression.text)
  );
}

/** Every `checkout.sessions.create(...)` call in `text`, parsed. */
function checkoutCreateCalls(text: string, path: string): ts.CallExpression[] {
  // Sound shortcut: such a call must spell the identifier `sessions` somewhere in the file.
  if (!text.includes('sessions')) return [];
  const file = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    // A .ts file is parsed as TS, not TSX: `<string>x` is a type assertion there, and parsing it
    // as JSX would swallow the code after it.
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isCheckoutCreate(node)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return calls;
}

/** `path` for every create call in the tree that does not take its key from the owner. */
function unkeyedCreators(files: { path: string; text: string }[]): string[] {
  return files.flatMap((f) =>
    checkoutCreateCalls(f.text, f.path)
      .filter((call) => !sendsOwnerKey(call))
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
    expect(checkoutCreateCalls(course?.text ?? '', 'local-course-checkout.ts')).toHaveLength(1);
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

  it('control: the owner key named only in a comment or nested in request data is caught (GP-789)', () => {
    const planted = [
      {
        path: 'planted/comment.ts',
        text: 'await stripe.checkout.sessions.create(req /* idempotencyKey: courseCheckoutIdempotencyKey(req) */);',
      },
      {
        path: 'planted/metadata.ts',
        text: 'await stripe.checkout.sessions.create({ mode: "payment", metadata: { idempotencyKey: courseCheckoutIdempotencyKey(req) } });',
      },
      {
        path: 'planted/nested-option.ts',
        text: 'await stripe.checkout.sessions.create(req, { extra: { idempotencyKey: checkoutSessionIdempotencyKey(id) } });',
      },
      {
        path: 'planted/keyed-session.ts',
        text: 'await getStripeClient().checkout.sessions.create(\n  { mode: "subscription" },\n  { idempotencyKey: checkoutSessionIdempotencyKey(id) }\n);',
      },
    ];
    expect(unkeyedCreators(planted)).toEqual([
      'planted/comment.ts',
      'planted/metadata.ts',
      'planted/nested-option.ts',
    ]);
  });

  it('control: a .ts file with a type assertion and a destructured `checkout` are still scanned', () => {
    const planted = [
      {
        // Parsed as TSX, `<string>x;` opens a JSX element that swallows the create call.
        path: 'planted/assertion.ts',
        text: 'const y = <string>x;\nawait stripe.checkout.sessions.create(req);',
      },
      {
        path: 'planted/destructured.ts',
        text: 'const { checkout } = stripe;\nawait checkout.sessions.create(req);',
      },
      {
        path: 'planted/destructured-keyed.ts',
        text: 'const { checkout } = stripe;\nawait checkout.sessions.create(req, { idempotencyKey: courseCheckoutIdempotencyKey(req) });',
      },
      {
        path: 'planted/component.tsx',
        text: 'const el = <div />;\nawait stripe.checkout.sessions.create(req);',
      },
    ];
    expect(unkeyedCreators(planted)).toEqual([
      'planted/assertion.ts',
      'planted/destructured.ts',
      'planted/component.tsx',
    ]);
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
