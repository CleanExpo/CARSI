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
 * The form is rendered here exactly as the browser receives it, in every mode. The copy, the
 * password field, the team-purchase options and the submit button must all follow the same
 * free-or-paid decision: the one the submit handler uses to choose between the free endpoint
 * and Stripe Checkout.
 */

const OLD_PAID_PROMISE = 'create your account and pay securely in one step';
const FREE_PROMISE = 'create your account and start learning in one step';
const FREE_BUTTON = 'Enrol free & start';
const TEAM_OPTIONS_LEGEND = 'Who is this for?';

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

function render(props: {
  slug: string;
  priceAud: number;
  isFree: boolean;
  showTeamOption?: boolean;
}): string {
  return renderToStaticMarkup(<GuestEnrolForm {...props} />);
}

describe('GuestEnrolForm: the promise, the fields and the button all match what the form does', () => {
  it('paid: asks for no password, says the account is set up after payment, and offers to pay', () => {
    const html = render({ slug: 'using-atp-to-create-protocols', priceAud: 20, isFree: false });
    expect(html).not.toContain('id="guest-password"');
    expect(html).not.toContain('type="password"');
    const text = shownText(html);
    expect(text).not.toContain(OLD_PAID_PROMISE);
    expect(text).not.toMatch(/create your account and pay/i);
    expect(text).toMatch(/after payment/i);
    expect(text).toMatch(/sign in there if you already have one/i);
    expect(text).toContain('Continue to pay — $20 AUD');
    expect(text).not.toContain(FREE_BUTTON);
    expect(html).toContain('id="guest-email"');
    expect(html).toContain('id="guest-full-name"');
  });

  it('free: keeps the password field, the one-step promise and the free button, which the free endpoint honours', () => {
    const html = render({ slug: 'using-air-scrubbers-and-afds', priceAud: 0, isFree: true });
    expect(html).toContain('id="guest-password"');
    expect(html).toContain('minLength="8"');
    const text = shownText(html);
    expect(text).toContain(FREE_PROMISE);
    expect(text).toContain(FREE_BUTTON);
    expect(text).not.toMatch(/after payment/i);
    expect(text).not.toMatch(/Continue to pay/);
  });

  it('a zero-price course is the free path everywhere, even when the flag is off: copy, field, button and options agree', () => {
    const html = render({ slug: 'zero-priced', priceAud: 0, isFree: false, showTeamOption: true });
    expect(html).toContain('id="guest-password"');
    const text = shownText(html);
    expect(text).toContain(FREE_PROMISE);
    expect(text).toContain(FREE_BUTTON);
    expect(text).not.toMatch(/Continue to pay/);
    expect(text).not.toMatch(/after payment/i);
    expect(text).not.toContain(TEAM_OPTIONS_LEGEND);
  });

  it('a paid course with the team option still offers seats, with the paid copy', () => {
    const html = render({ slug: 'paid-team', priceAud: 149, isFree: false, showTeamOption: true });
    const text = shownText(html);
    expect(text).toContain(TEAM_OPTIONS_LEGEND);
    expect(text).toMatch(/after payment/i);
    expect(html).not.toContain('id="guest-password"');
    expect(text).toContain('Continue to pay — $149 AUD');
  });

  it('positive control: the pre-fix paid copy fails the paid checks', () => {
    expect(OLD_PAID_PROMISE).toMatch(/create your account and pay/i);
    expect(OLD_PAID_PROMISE).not.toMatch(/after payment/i);
  });
});
