import { describe, expect, it } from 'vitest';

import { parseMarketingListPageSize } from './admin-marketing-list';
import { sanitizeMarketingEmailBodyHtml } from './marketing-email-html';

describe('admin marketing list', () => {
  it('parses page size batches', () => {
    expect(parseMarketingListPageSize('25')).toBe(25);
    expect(parseMarketingListPageSize('80')).toBe(80);
    expect(parseMarketingListPageSize('99')).toBe(25);
  });
});

describe('marketing email html', () => {
  it('strips scripts from rich body', () => {
    const out = sanitizeMarketingEmailBodyHtml('<p>Hi</p><script>alert(1)</script>');
    expect(out).toContain('Hi');
    expect(out).not.toContain('script');
  });
});
