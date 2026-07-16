import { describe, expect, it } from 'vitest';

import { buildRegistrationEmail } from './ccw-roadshow-registration-email';

const base = {
  attendeeName: 'Jane',
  eventCity: 'Melbourne',
  dateRangeLabel: 'Wednesday 22 July - Thursday 23 July 2026',
  timeLabel: '8.30am-4.30pm both days',
  venueName: 'Carpet Cleaners Warehouse Melbourne',
  venueAddress: 'Unit 1/5 Gatwick Road, Bayswater North VIC 3153',
  seatCount: 2,
  freeEntryToken: 'CCW-FREE-MEL-ABCD1234',
  eventPageUrl: 'https://www.carsi.com.au/events/ccw-roadshow',
};

describe('buildRegistrationEmail', () => {
  it('confirmed email includes the token and a check-in instruction', () => {
    const email = buildRegistrationEmail({ ...base, kind: 'confirmed' });
    expect(email.subject).toMatch(/confirmed/i);
    expect(email.text).toContain(base.freeEntryToken);
    expect(email.text.toLowerCase()).toContain('check-in');
  });

  it('waitlisted email mentions the waitlist and does NOT tell them to show a token at check-in', () => {
    const email = buildRegistrationEmail({ ...base, kind: 'waitlisted' });
    expect(email.subject).toMatch(/waitlist/i);
    expect(email.text.toLowerCase()).toContain('waitlist');
    expect(email.text.toLowerCase()).not.toContain('show this token at check-in');
  });

  it('promoted email includes the token and says a seat opened up', () => {
    const email = buildRegistrationEmail({ ...base, kind: 'promoted' });
    expect(email.subject).toMatch(/you're in|seat/i);
    expect(email.text).toContain(base.freeEntryToken);
    expect(email.text.toLowerCase()).toContain('check-in');
  });

  it('renders the voucher CTA (money copy + link) only when voucherUrl is supplied', () => {
    const withVoucher = buildRegistrationEmail({
      ...base,
      kind: 'confirmed',
      voucherUrl: 'https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training',
    });
    expect(withVoucher.text).toContain('$100');
    expect(withVoucher.text).toContain('$50');
    expect(withVoucher.text).toContain('$150');
    expect(withVoucher.text).toContain('ccwonline.com.au');
    expect(withVoucher.html).toContain('Get your voucher');

    const withoutVoucher = buildRegistrationEmail({ ...base, kind: 'confirmed' });
    expect(withoutVoucher.text).not.toContain('Get your voucher');
    expect(withoutVoucher.text).not.toContain('$150');
  });

  it('always includes the event city, dates and venue', () => {
    for (const kind of ['confirmed', 'waitlisted', 'promoted'] as const) {
      const email = buildRegistrationEmail({ ...base, kind });
      expect(email.text).toContain('Melbourne');
      expect(email.text).toContain(base.dateRangeLabel);
      expect(email.text).toContain(base.venueName);
    }
  });
});
