import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CredentialVerificationPageContent } from '@/components/lms/CredentialVerificationPageContent';
import {} from '@/lib/certificate/certificate-cec-wording';
import { getApprovedCecHours } from '@/lib/seed/cec-approvals';
import { certificateCecWordingForCourse } from '@/lib/server/certificate-cec-wording';
import type { PublicCredentialJson } from '@/lib/server/credential-public';

/**
 * GP-757, review round 1 (discovery): the certificate art was fixed, but the rest of the verify
 * surfaces still printed IICRC and CEC copy unconditionally: the "What this credential is"
 * statement on /verify/credential (which used the retired provider phrase) and the per-course
 * "0 CEC" line on the shared training record (/verify/training-record and its PDF). Every IICRC or
 * CEC line on these surfaces now comes from the certificate wording owner.
 */

const NOT_APPROVED_SLUG = 'water-damage-restoration-fundamentals';
const APPROVED_SLUG = 'introduction-to-porous-materials-drying';

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function credential(slug: string): PublicCredentialJson {
  return {
    credential_id: '00000000-0000-0000-0000-000000000001',
    valid: true,
    status: 'issued',
    student_name: 'Jane Smith',
    course_title: 'Course title',
    iicrc_discipline: '—',
    cec_hours: getApprovedCecHours(slug) ?? 0,
    issued_date: '2026-03-01',
    issuing_organisation: 'CARSI Learning',
    verification_url: 'https://carsi.com.au/verify/credential/00000000-0000-0000-0000-000000000001',
    completed_at: '2026-03-01T00:00:00.000Z',
    certificate_wording: certificateCecWordingForCourse(slug),
  };
}

function renderVerifyPage(
  slug: string,
  submission: { cecSubmissionStatus?: string | null; cecSubmittedAt?: string | null } = {}
): string {
  return text(
    renderToStaticMarkup(
      <CredentialVerificationPageContent
        credential={credential(slug)}
        credentialId="00000000-0000-0000-0000-000000000001"
        {...submission}
      />
    )
  );
}

describe('public credential verify page (GP-757)', () => {
  it('a credential for a course not on the approvals register renders no IICRC text', () => {
    const out = renderVerifyPage(NOT_APPROVED_SLUG);
    expect(out).toContain('What this credential is');
    expect(out).not.toMatch(/IICRC/i);
    expect(out).not.toMatch(/\bCECs?\b/);
  });

  it('a credential for a registry-approved course renders "Course approved for IICRC CECs"', () => {
    const out = renderVerifyPage(APPROVED_SLUG);
    expect(out).toContain('Course approved for IICRC CECs');
    expect(out).toContain('CARSI is an IICRC Approved CEC Provider.');
  });

  it('a sent IICRC submission row on a course not on the register shows no "submitted to IICRC" banner', () => {
    // An old submission row, or a course since taken off the register, must not name the IICRC.
    const out = renderVerifyPage(NOT_APPROVED_SLUG, { cecSubmissionStatus: 'sent' });
    expect(out).not.toContain('submitted to IICRC');
    expect(out).not.toMatch(/IICRC/i);
  });

  it('a sent IICRC submission row on a registry-approved course still shows the banner', () => {
    const out = renderVerifyPage(APPROVED_SLUG, {
      cecSubmissionStatus: 'sent',
      cecSubmittedAt: '2026-03-02T00:00:00.000Z',
    });
    expect(out).toContain('CEC submitted to IICRC');
  });

  it('no credential verify page renders "Accredited"', () => {
    for (const slug of [NOT_APPROVED_SLUG, APPROVED_SLUG]) {
      expect(renderVerifyPage(slug)).not.toMatch(/accredit/i);
    }
  });
});

// The shared training record and its PDF are owned by src/lib/proof-pack-cec-wording.ts on main
// (GP-748, #1297), which already names the IICRC only for approved courses.
