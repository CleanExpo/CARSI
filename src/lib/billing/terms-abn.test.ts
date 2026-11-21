import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CARSI_ABN_ENV } from '@/lib/billing/tax-invoice';
import TermsPage from '../../../app/(public)/terms/page';

const renderTerms = () => renderToStaticMarkup(createElement(TermsPage));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Terms page ABN (GP-761, GP-746)', () => {
  it('shows no ABN placeholder when the ABN is not configured', () => {
    vi.stubEnv(CARSI_ABN_ENV, '');
    const html = renderTerms();
    expect(html).toContain('CARSI Pty Ltd');
    expect(html).not.toMatch(/to be confirmed/i);
    expect(html).not.toMatch(/\bABN\b/);
  });

  it('shows no placeholder when the configured value is not a valid ABN', () => {
    vi.stubEnv(CARSI_ABN_ENV, '12 345 678 901');
    const html = renderTerms();
    expect(html).not.toMatch(/\bABN\b/);
    expect(html).not.toContain('12 345 678 901');
  });

  it('shows the ABN from the same config reader the tax invoice uses', () => {
    // SYNTHETIC, TEST-ONLY ABN (checksum-valid). Never CARSI's ABN.
    vi.stubEnv(CARSI_ABN_ENV, '10000000000');
    expect(renderTerms()).toContain('CARSI Pty Ltd (ABN 10 000 000 000)');
  });
});
