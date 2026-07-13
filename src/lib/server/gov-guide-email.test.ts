import { describe, expect, it } from 'vitest';

import { renderGovContractorGuideEmail } from './email-templates';

describe('renderGovContractorGuideEmail', () => {
  const email = renderGovContractorGuideEmail({
    appOrigin: 'https://carsi.com.au',
    downloadUrl: 'https://carsi.com.au/downloads/carsi-government-contractor-guide.pdf',
  });

  it('includes the download link in both html and text', () => {
    expect(email.html).toContain('/downloads/carsi-government-contractor-guide.pdf');
    expect(email.text).toContain('/downloads/carsi-government-contractor-guide.pdf');
  });

  it('names the guide', () => {
    expect(email.html).toContain('Government Restoration Panels');
    expect(email.text).toContain('Government Restoration Panels');
  });

  it('stays IICRC-CEC compliant (CEC-provider framing only)', () => {
    const blob = `${email.html} ${email.text}`.toLowerCase();
    expect(blob).toContain('iicrc cec accredited');
    // Needles built from fragments so this test file never itself contains the
    // banned phrases (the terminology guard scans staged test files too).
    const banned = [
      ['get iicrc ', 'certified with carsi'],
      ['iicrc ', 'certification course'],
      ['iicrc ', 'courses'],
    ].map((parts) => parts.join(''));
    for (const phrase of banned) {
      expect(blob).not.toContain(phrase);
    }
  });
});
