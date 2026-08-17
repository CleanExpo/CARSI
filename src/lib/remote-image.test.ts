import { describe, expect, it } from 'vitest';

import { cloudinaryDeliveryUrl } from './remote-image';

const RAW =
  'https://res.cloudinary.com/dmaulkthb/image/upload/v1782410710/carsi/admin-courses/9e530122-2810-43e5-81e9-f30941703ceb.png';

describe('cloudinaryDeliveryUrl', () => {
  it('inserts the delivery transformation ahead of the version segment', () => {
    expect(cloudinaryDeliveryUrl(RAW, 400)).toBe(
      'https://res.cloudinary.com/dmaulkthb/image/upload/f_auto,q_auto,c_limit,w_400/v1782410710/carsi/admin-courses/9e530122-2810-43e5-81e9-f30941703ceb.png',
    );
  });

  it('honours the requested width', () => {
    expect(cloudinaryDeliveryUrl(RAW, 1200)).toContain('w_1200');
  });

  // c_limit is what stops a small original being upscaled into a bigger file than it started as.
  it('limits rather than scales, so a small original is never upscaled', () => {
    expect(cloudinaryDeliveryUrl(RAW, 400)).toContain('c_limit');
  });

  it('is idempotent — a second pass does not stack transformations', () => {
    const once = cloudinaryDeliveryUrl(RAW, 400);
    expect(cloudinaryDeliveryUrl(once, 800)).toBe(once);
  });

  it('leaves a hand-written transformation alone', () => {
    const hand =
      'https://res.cloudinary.com/dmaulkthb/image/upload/w_300,h_200,c_fill/v1/carsi/a.png';
    expect(cloudinaryDeliveryUrl(hand, 400)).toBe(hand);
  });

  it('passes through non-Cloudinary hosts untouched', () => {
    const other = 'https://cdn.example.com/image/upload/v1/thing.png';
    expect(cloudinaryDeliveryUrl(other, 400)).toBe(other);
    expect(cloudinaryDeliveryUrl('https://example.com/a.png', 400)).toBe('https://example.com/a.png');
    expect(cloudinaryDeliveryUrl('/local/a.png', 400)).toBe('/local/a.png');
  });

  it('falls back to a sane width for a nonsense one', () => {
    expect(cloudinaryDeliveryUrl(RAW, 0)).toContain('w_800');
    expect(cloudinaryDeliveryUrl(RAW, -10)).toContain('w_800');
    expect(cloudinaryDeliveryUrl(RAW, Number.NaN)).toContain('w_800');
  });

  it('rounds a fractional width, since Cloudinary wants an integer', () => {
    expect(cloudinaryDeliveryUrl(RAW, 399.6)).toContain('w_400');
  });
});
