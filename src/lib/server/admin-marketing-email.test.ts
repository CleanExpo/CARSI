import { describe, expect, it } from 'vitest';

import { isUuid, resolveMarketingImageUrl } from './admin-marketing-email';
import { formatMarketingBodyAsHtml, renderAdminMarketingEmail } from './email-templates';

describe('admin marketing email helpers', () => {
  it('accepts only uuid recipient ids', () => {
    expect(isUuid('6011d465-1981-487b-84e3-a53b10a2bd07')).toBe(true);
    expect(isUuid('not-an-id')).toBe(false);
  });

  it('allows local upload paths and Cloudinary https urls', () => {
    expect(resolveMarketingImageUrl('https://carsi.com.au', '/uploads/admin-courses/a.png')).toBe(
      'https://carsi.com.au/uploads/admin-courses/a.png'
    );
    expect(
      resolveMarketingImageUrl(
        'https://carsi.com.au',
        'https://res.cloudinary.com/demo/image/upload/v1/x.jpg'
      )
    ).toContain('res.cloudinary.com');
    expect(resolveMarketingImageUrl('https://carsi.com.au', 'https://evil.example/x.png')).toBe(
      null
    );
    expect(resolveMarketingImageUrl('https://carsi.com.au', 'javascript:alert(1)')).toBe(null);
  });

  it('formats body into paragraphs, bullets, links, and bold', () => {
    const html = formatMarketingBodyAsHtml(
      'First paragraph with **emphasis**.\n\nSecond line still one paragraph if no blank line.\n\n- Item one\n- Item two\n\nSee https://carsi.com.au/courses'
    );
    expect(html).toContain('<p style=');
    expect(html).toContain('<strong');
    expect(html).toContain('<ul');
    expect(html).toContain('Item one');
    expect(html).toContain('href="https://carsi.com.au/courses"');
    expect(html).not.toContain('<script>');
  });

  it('escapes body html and includes unsubscribe', () => {
    const { html, text } = renderAdminMarketingEmail({
      appOrigin: 'https://carsi.com.au',
      name: 'Sam',
      title: 'April offer',
      body: 'See <script>alert(1)</script>\nnext line',
      imageUrl: 'https://carsi.com.au/uploads/admin-courses/a.png',
      unsubscribeUrl: 'https://carsi.com.au/unsubscribe?token=abc',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('https://carsi.com.au/uploads/admin-courses/a.png');
    expect(html).toContain('/unsubscribe?token=abc');
    expect(html).toContain('Hi Sam,');
    expect(html).toContain('Phill McGurk');
    expect(html).toContain('IICRC CEC Accredited');
    expect(text).toContain('Founder | CARSI');
    expect(text).toContain('Unsubscribe:');
  });
});
