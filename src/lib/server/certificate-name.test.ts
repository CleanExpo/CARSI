import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_HOLDER_FALLBACK,
  canIssueCertificate,
  certificateHolderDisplayName,
  certificateHolderName,
} from './certificate-name';

describe('certificateHolderName', () => {
  it('returns the trimmed real name when one is on file', () => {
    expect(certificateHolderName({ fullName: 'Jane Smith' })).toBe('Jane Smith');
    expect(certificateHolderName({ fullName: '  Tāmati Ngāpō  ' })).toBe('Tāmati Ngāpō');
  });

  it('returns null when the name is missing, empty, or whitespace (#302)', () => {
    expect(certificateHolderName({ fullName: null })).toBeNull();
    expect(certificateHolderName({ fullName: '' })).toBeNull();
    expect(certificateHolderName({ fullName: '   ' })).toBeNull();
  });
});

describe('canIssueCertificate', () => {
  it('permits issuance only when a real name is on file', () => {
    expect(canIssueCertificate({ fullName: 'Jane Smith' })).toBe(true);
    expect(canIssueCertificate({ fullName: null })).toBe(false);
    expect(canIssueCertificate({ fullName: '   ' })).toBe(false);
  });
});

describe('certificateHolderDisplayName', () => {
  it('renders the real name when present', () => {
    expect(certificateHolderDisplayName({ fullName: 'Jane Smith' })).toBe('Jane Smith');
  });

  it('renders a neutral fallback — never an email — when no name is on file (#302)', () => {
    // The poison this guards against: an account whose name was never captured
    // must never have the email (or its local-part) rendered as a credential name.
    const display = certificateHolderDisplayName({ fullName: null });
    expect(display).toBe(CERTIFICATE_HOLDER_FALLBACK);
    expect(display).not.toContain('@');
  });
});
