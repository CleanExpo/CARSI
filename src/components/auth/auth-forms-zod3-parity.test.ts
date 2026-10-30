// @vitest-environment jsdom
import { zodResolver } from '@hookform/resolvers/zod';
import { describe, expect, it, vi } from 'vitest';

import oracle from './auth-forms-zod3-oracle.json';
import { formSchema as loginSchema } from './login-form';
import { formSchema as registerSchema } from './register-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// The login and register forms must accept and reject exactly what they did under zod 3.25.76.
// Expected field errors in auth-forms-zod3-oracle.json were produced by the pre-upgrade schemas
// under zod 3.25.76 (scratch install outside the repo). Includes astral characters (emoji),
// which zod 3 counts as two UTF-16 units and zod 4 counts as one code point. Rows are stored
// positionally: [field values in oracle.fields order, {field index: first error message}].
type Row = [string[], Record<string, string>];

function unpack(fields: string[], [vals, errs]: Row) {
  const values = Object.fromEntries(fields.map((f, i) => [f, vals[i]]));
  const expected = Object.fromEntries(Object.entries(errs).map(([i, m]) => [fields[Number(i)], m]));
  return { values, expected };
}

async function fieldErrors(
  schema: Parameters<typeof zodResolver>[0],
  values: Record<string, string>
) {
  const result = await zodResolver(schema)(values, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
  });
  const out: Record<string, string> = {};
  for (const [field, err] of Object.entries(result.errors)) {
    out[field] = (err as { message: string }).message;
  }
  return { out, values: result.values };
}

describe('auth forms keep zod 3 validation', () => {
  it.each(oracle.login as Row[])('login %j -> %j', async (...row) => {
    const { values, expected } = unpack(oracle.fields.login, row as Row);
    const { out, values: submitted } = await fieldErrors(loginSchema, values);
    expect(out).toEqual(expected);
    expect(submitted).toEqual(Object.keys(expected).length ? {} : values);
  });

  it.each(oracle.register as Row[])('register %j -> %j', async (...row) => {
    const { values, expected } = unpack(oracle.fields.register, row as Row);
    const { out } = await fieldErrors(registerSchema, values);
    expect(out).toEqual(expected);
  });
});
