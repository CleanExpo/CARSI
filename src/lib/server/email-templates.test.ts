import { describe, expect, it } from 'vitest';

import { renderEnrollmentWelcomeEmail, renderToolboxTalkEmail } from './email-templates';

const enrolBase = {
  appOrigin: 'https://carsi.com.au',
  name: 'Sam',
  courseTitle: 'CCW/CARSI 2 Day Workshop',
  startUrl: 'https://carsi.com.au/learn/x',
  dashboardUrl: 'https://carsi.com.au/dashboard/student',
};

describe('renderEnrollmentWelcomeEmail — attendee offers', () => {
  const ccwOffer = {
    key: 'ccw-store-credit' as const,
    label: 'CCW attendee voucher',
    detail: 'Purchase your CCW/CARSI 2-day training voucher.',
    url: 'https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training',
    live: true,
  };

  it('renders the offer link + label in html and text when offers are supplied', () => {
    const { html, text } = renderEnrollmentWelcomeEmail({ ...enrolBase, offers: [ccwOffer] });
    expect(html).toContain(ccwOffer.url);
    expect(html).toContain('CCW attendee voucher');
    expect(text).toContain(ccwOffer.url);
  });

  it('omits any offers section when no offers are supplied', () => {
    const { html, text } = renderEnrollmentWelcomeEmail(enrolBase);
    expect(html).not.toContain('ccwonline.com.au');
    expect(text.toLowerCase()).not.toContain('attendee offer');
  });

  it('omits any offers section when an empty array is supplied', () => {
    const { html } = renderEnrollmentWelcomeEmail({ ...enrolBase, offers: [] });
    expect(html).not.toContain('ccwonline.com.au');
  });
});

const base = {
  appOrigin: 'https://carsi.com.au',
  name: 'Sam',
  talkTitle: 'Working at Heights',
  monthLabel: 'March',
  courseUrl: 'https://carsi.com.au/courses/toolbox-talks',
};

describe('renderToolboxTalkEmail', () => {
  it('embeds the one-click unsubscribe link in both html and text when provided', () => {
    const url = 'https://carsi.com.au/unsubscribe?token=abc.def';
    const { html, text } = renderToolboxTalkEmail({ ...base, unsubscribeUrl: url });
    expect(html).toContain(url);
    expect(html).toContain('Unsubscribe');
    expect(text).toContain(url);
  });

  it('omits the unsubscribe line when no url is supplied', () => {
    const { html, text } = renderToolboxTalkEmail(base);
    expect(html).not.toContain('/unsubscribe?token=');
    expect(text).not.toContain('/unsubscribe?token=');
  });
});
