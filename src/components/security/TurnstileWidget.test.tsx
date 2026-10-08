import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { effect } = vi.hoisted(() => ({ effect: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useRef: () => ({ current: {} }),
  useEffect: effect,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.resetModules();
});

describe('Turnstile surface', () => {
  it.each([undefined, 'light', 'dark'] as const)(
    'renders with the %s surface and preserves token callbacks',
    async (surface) => {
      vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'test-site-key');
      const render = vi.fn();
      vi.stubGlobal('window', { turnstile: { render } });
      const onVerify = vi.fn();
      const { TurnstileWidget } = await import('./TurnstileWidget');
      renderToStaticMarkup(<TurnstileWidget onVerify={onVerify} surface={surface} />);
      const cleanup = effect.mock.calls[0][0]();
      await Promise.resolve();
      expect(render).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          sitekey: 'test-site-key',
          theme: surface ?? 'light',
        })
      );
      const options = render.mock.calls[0][1];
      options.callback('verified-token');
      options['expired-callback']();
      options['error-callback']();
      expect(onVerify.mock.calls).toEqual([['verified-token'], [''], ['']]);
      cleanup();
    }
  );

  it('still renders nothing when Turnstile is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
    const { TurnstileWidget } = await import('./TurnstileWidget');
    expect(renderToStaticMarkup(<TurnstileWidget onVerify={() => {}} />)).toBe('');
  });
});
