import type { Metadata } from 'next';
import { describe, expect, it } from 'vitest';

import * as loginPage from '../../../app/(auth)/login/page';
import * as registerPage from '../../../app/(auth)/register/page';

/**
 * Live sweep 2026-11-23: https://carsi.com.au/login and /register rendered the root layout's
 * default title and description (the home page's), so three pages shared one title and one
 * description, and both auth pages said `index, follow` although robots.txt disallows them.
 */
const HOME_TITLE = 'CARSI | Restoration Training, IICRC CEC Platform';

function metadataOf(mod: unknown): Metadata | undefined {
  return (mod as { metadata?: Metadata }).metadata;
}

describe.each([
  ['login', loginPage],
  ['register', registerPage],
])('/%s page metadata', (_name, mod) => {
  const metadata = metadataOf(mod);

  it('sets its own title, not the home page default', () => {
    expect(typeof metadata?.title).toBe('string');
    expect(metadata?.title).not.toBe(HOME_TITLE);
  });

  it('sets its own description', () => {
    expect(typeof metadata?.description).toBe('string');
    expect((metadata?.description as string).length).toBeGreaterThan(40);
  });

  it('asks search engines not to index the page', () => {
    expect(metadata?.robots).toMatchObject({ index: false });
  });
});

it('login and register do not share a title or description', () => {
  const a = metadataOf(loginPage);
  const b = metadataOf(registerPage);
  expect(a?.title).not.toBe(b?.title);
  expect(a?.description).not.toBe(b?.description);
});
