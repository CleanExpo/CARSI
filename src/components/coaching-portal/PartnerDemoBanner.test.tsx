import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PartnerDemoBanner } from '@/components/coaching-portal/PartnerDemoBanner';
import { PARTNER_DEMO_EMAIL_DOMAIN } from '@/lib/coaching-portal/partner-demo';

describe('PartnerDemoBanner', () => {
  it('shows a demo-mode banner for the demo member', () => {
    const html = renderToStaticMarkup(
      createElement(PartnerDemoBanner, { email: `partner.demo.member@${PARTNER_DEMO_EMAIL_DOMAIN}` })
    );
    expect(html).toContain('data-testid="coaching-partner-demo-banner"');
    expect(html).toContain('Demo mode');
    expect(html).toContain('role="status"');
  });

  it('renders nothing for a real member', () => {
    const html = renderToStaticMarkup(createElement(PartnerDemoBanner, { email: 'owner@carsi.com.au' }));
    expect(html).toBe('');
  });
});
