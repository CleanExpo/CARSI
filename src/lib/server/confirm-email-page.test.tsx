import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The page must not be able to change an account: it may not even load the
// code that writes. Either import below would make this module fail to load.
vi.mock('@/lib/server/lms-auth', () => {
  throw new Error('the confirm-email page must not import lms-auth');
});
vi.mock('@/lib/prisma', () => {
  throw new Error('the confirm-email page must not import prisma');
});

const { default: ConfirmEmailPage, metadata } =
  await import('../../../app/(auth)/confirm-email/page');

async function render(searchParams: { token?: string | string[] }): Promise<string> {
  return renderToStaticMarkup(
    await ConfirmEmailPage({ searchParams: Promise.resolve(searchParams) })
  );
}

describe('/confirm-email page (GP-699)', () => {
  it('offers a button that posts the token, so only a person pressing it confirms', async () => {
    const html = await render({ token: 'abc.def.ghi' });

    expect(html).toContain('<form action="/api/auth/verify-email" method="post">');
    expect(html).toContain('<input type="hidden" name="token" value="abc.def.ghi"/>');
    expect(html).toContain('Confirm my email');
  });

  it('escapes the token, so a crafted link cannot inject markup', async () => {
    const html = await render({ token: '"><script>alert(1)</script>' });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('shows no form when the link has no token', async () => {
    for (const params of [{}, { token: '   ' }, { token: ['a', 'b'] }]) {
      const html = await render(params);
      expect(html).not.toContain('<form');
      expect(html).toContain('This confirmation link is incomplete.');
    }
  });

  it('keeps the token out of search engines and referrer headers', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe('no-referrer');
  });
});
