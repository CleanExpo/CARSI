import { describe, expect, it } from 'vitest';

import {
  renderCcwRoadshowOfferPackEmail,
  renderEnrollmentWelcomeEmail,
  renderToolboxTalkEmail,
  renderYearlyMembershipEmail,
} from './email-templates';

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

/**
 * REGRESSION (Bugbot, PR #694): the grant was fixed to pass the count a member can actually
 * open, but this template still framed every send as full-library access — "all N published
 * courses", "Full library access is ready", "any published course in the catalogue". The
 * honest number and the surrounding copy disagreed, so a member short a revoked or failed
 * course was still promised the whole catalogue.
 */
describe('renderYearlyMembershipEmail — access claim matches actual access', () => {
  const base = {
    appOrigin: 'https://carsi.com.au',
    memberName: 'Sam',
    memberEmail: 'sam@example.com',
    temporaryPassword: 'temp-pw',
    priceLabel: 'Complimentary (no charge)',
    durationLabel: '12 months from activation',
    loginUrl: 'https://carsi.com.au/login',
    dashboardUrl: 'https://carsi.com.au/dashboard/student',
  };

  it('claims the full library when the member can reach every published course', () => {
    const { html, text } = renderYearlyMembershipEmail({
      ...base,
      courseCount: 25,
      publishedCourseCount: 25,
    });

    expect(html).toContain('all 25 published courses');
    expect(html).toContain('Full library access is ready');
    expect(html).toContain('any published course in the catalogue');
    expect(text).toContain('all 25 published courses');
  });

  it('drops the full-library claim when some courses are unreachable', () => {
    const { html, text } = renderYearlyMembershipEmail({
      ...base,
      courseCount: 24,
      publishedCourseCount: 25,
    });

    expect(html).toContain('24 of 25 published courses');
    expect(html).not.toContain('all 24 published courses');
    expect(html).not.toContain('Full library access is ready');
    expect(html).not.toContain('any published course in the catalogue');
    expect(text).toContain('24 of 25 published courses');
    expect(text).not.toContain('all 24 published courses');
  });

  it('keeps the original wording when the published total is not supplied', () => {
    const { html } = renderYearlyMembershipEmail({ ...base, courseCount: 25 });

    expect(html).toContain('all 25 published courses');
    expect(html).toContain('Full library access is ready');
  });

  it('uses the singular form for a one-course full grant', () => {
    const { html } = renderYearlyMembershipEmail({
      ...base,
      courseCount: 1,
      publishedCourseCount: 1,
    });

    expect(html).toContain('1 published course');
    expect(html).not.toContain('all 1 published');
  });

  it('reports one-of-many rather than the singular when only one is reachable', () => {
    const { html } = renderYearlyMembershipEmail({
      ...base,
      courseCount: 1,
      publishedCourseCount: 25,
    });

    expect(html).toContain('1 of 25 published courses');
    expect(html).not.toContain('Full library access is ready');
  });
});

describe('CCW offer pack — the Shopify CTA is omitted, never broken', () => {
  const base = {
    appOrigin: 'https://carsi.example.test',
    attendeeName: 'Sam Attendee',
    eventCity: 'Melbourne',
    eventDates: '22–23 July 2026',
    membershipCheckoutUrl: 'https://carsi.example.test/subscribe?offer=ccw-attendee',
    membershipPriceLabel: '$295 first year, then $795 / year',
    socialLinks: [{ label: 'CCW on X', href: 'https://x.com/ccwonline' }],
  };

  it('renders the CTA when a distributable product URL is supplied', () => {
    const { html, text } = renderCcwRoadshowOfferPackEmail({
      ...base,
      shopifyTrainingUrl: 'https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training',
    });

    expect(html).toContain('View Shopify training product');
    expect(html).toContain('https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training');
    expect(text).toContain('Shopify training product:');
  });

  it('drops the CTA entirely when there is no safe URL — no placeholder, no dead link', () => {
    const { html, text } = renderCcwRoadshowOfferPackEmail({
      ...base,
      shopifyTrainingUrl: null,
    });

    expect(html).not.toContain('View Shopify training product');
    expect(html).not.toContain('Shopify —');
    expect(text).not.toContain('Shopify training product:');
    // The rest of the pack must still send.
    expect(html).toContain('Claim');
    expect(text).toContain(base.membershipCheckoutUrl);
    // Nothing that reads as an empty or undefined href sneaks through.
    expect(html).not.toContain('href=""');
    expect(html).not.toContain('undefined');
    expect(text).not.toContain('undefined');
  });
});
