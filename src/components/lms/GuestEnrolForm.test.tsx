import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GuestEnrolForm } from './GuestEnrolForm';

/**
 * WS1 fix 4 (GP-543, directive break 6). Observed live on carsi.com.au on 2026-09-03: the paid
 * quick-enrol form said "create your account and pay securely in one step" and required a
 * password, but only the email and name reached checkout; the password was discarded. A buyer
 * who abandoned checkout had no account and saw "Invalid credentials" on sign-in, and a buyer
 * who paid was asked to set a password again on the confirmation page.
 *
 * The form is rendered here exactly as the browser receives it, in both modes.
 */

const OLD_PAID_PROMISE = 'create your account and pay securely in one step';

/** The text a browser would show: tags dropped, React's escapes undone. */
function shownText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function render(props: { slug: string; priceAud: number; isFree: boolean }): string {
  return renderToStaticMarkup(<GuestEnrolForm {...props} />);
}

describe('GuestEnrolForm: the promise matches what the form does', () => {
  it('paid: asks for no password and says the account is set up after payment', () => {
    const html = render({ slug: 'using-atp-to-create-protocols', priceAud: 20, isFree: false });
    expect(html).not.toContain('id="guest-password"');
    expect(html).not.toContain('type="password"');
    const text = shownText(html);
    expect(text).not.toContain(OLD_PAID_PROMISE);
    expect(text).not.toMatch(/create your account and pay/i);
    expect(text).toMatch(/after payment/i);
    expect(text).toContain('Continue to pay — $20 AUD');
    expect(html).toContain('id="guest-email"');
    expect(html).toContain('id="guest-full-name"');
  });

  it('free: keeps the password field and the one-step promise, which the free endpoint honours', () => {
    const html = render({ slug: 'using-air-scrubbers-and-afds', priceAud: 0, isFree: true });
    expect(html).toContain('id="guest-password"');
    expect(html).toContain('minLength="8"');
    const text = shownText(html);
    expect(text).toContain('create your account and start learning in one step');
    expect(text).toContain('Enrol free & start');
    expect(text).not.toMatch(/after payment/i);
  });

  it('a zero-price course is the free path even when the flag is off', () => {
    const html = render({ slug: 'zero-priced', priceAud: 0, isFree: false });
    expect(html).toContain('id="guest-password"');
    expect(shownText(html)).toContain('start learning in one step');
  });

  it('positive control: the pre-fix paid copy fails the paid checks', () => {
    expect(OLD_PAID_PROMISE).toMatch(/create your account and pay/i);
    expect(OLD_PAID_PROMISE).not.toMatch(/after payment/i);
  });
});
