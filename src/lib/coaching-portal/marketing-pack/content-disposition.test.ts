import { describe, expect, it } from 'vitest';

import { attachmentContentDisposition } from '@/lib/coaching-portal/marketing-pack/content-disposition';

describe('attachmentContentDisposition', () => {
  it('includes ascii fallback and UTF-8 filename*', () => {
    const h = attachmentContentDisposition('30-day-social-calendar.csv');
    expect(h).toContain('filename="30-day-social-calendar.csv"');
    expect(h).toContain("filename*=UTF-8''");
  });

  it('strips quotes from fallback', () => {
    const h = attachmentContentDisposition('bad"name.csv');
    expect(h).not.toContain('bad"name');
  });
});
