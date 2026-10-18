import type { Page } from '@playwright/test';

/**
 * Shared by the membership funnel specs. Replaces window.gtag with a recorder before any page
 * script runs, so an event only counts if the page itself sends it, and records every gtag call
 * (config included) in order. Real Google requests are blocked: no test traffic reaches GA.
 *
 * GA4 is "ready" only once GoogleAnalytics.tsx has sent its config command, which needs a
 * measurement id: the CI production build has one; a local dev server needs
 * NEXT_PUBLIC_GA_MEASUREMENT_ID set (any G- id; requests to Google are blocked here).
 */
export type GtagCall = { command: string; name: string; params: Record<string, unknown> };

export async function recordGtag(page: Page): Promise<GtagCall[]> {
  const calls: GtagCall[] = [];
  await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
  await page.exposeFunction(
    '__e2eRecordGtag',
    (command: string, name: string, params: Record<string, unknown>) => {
      calls.push({ command, name, params });
    }
  );
  await page.addInitScript(() => {
    const w = window as unknown as {
      __e2eRecordGtag: (command: string, name: string, params: unknown) => void;
    };
    const recorder = (...args: unknown[]) => {
      w.__e2eRecordGtag(String(args[0]), String(args[1] ?? ''), args[2] ?? {});
    };
    // Locked so /ga-init.js cannot swap the recorder out.
    Object.defineProperty(window, 'gtag', {
      configurable: false,
      get: () => recorder,
      set: () => {},
    });
  });
  return calls;
}

export const events = (calls: GtagCall[], name: string) =>
  calls.filter((c) => c.command === 'event' && c.name === name);

/** Index of the first GA4 config command, or -1. */
export const configIndex = (calls: GtagCall[]) => calls.findIndex((c) => c.command === 'config');

export const STRIPE_URL = 'https://checkout.stripe.com/c/pay/e2e-membership';

export async function stubStripe(page: Page) {
  await page.route('https://checkout.stripe.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>stripe stub</title>' })
  );
}
