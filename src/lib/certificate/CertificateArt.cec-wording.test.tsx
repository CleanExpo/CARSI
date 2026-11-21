import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CertificateArt } from '@/lib/certificate/CertificateArt';
import { getApprovedCecHours, getCecApproval } from '@/lib/seed/cec-approvals';
import { completionCertificateDataFromEnrollment } from '@/lib/server/certificate-pdf';

/**
 * GP-757: the printed certificate (the PDF is a raster of this art) may name the IICRC only for a
 * course the approvals register (data/seed/cec-approvals.json) lists as approved. Founder rules
 * GP-704 and GP-748: CARSI is never called accredited by the IICRC; a course not on the register
 * shows no IICRC wording at all, not even a disclaimer.
 */

/** Live on the site, not on the register (GP-748 sweep). */
const NOT_APPROVED_SLUG = 'water-damage-restoration-fundamentals';
/** On the register with status approved. */
const APPROVED_SLUG = 'introduction-to-porous-materials-drying';

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderArt(courseSlug: string): string {
  return text(
    renderToStaticMarkup(
      <CertificateArt
        logoSrc="data:image/png;base64,AA=="
        studentName="Jane Smith"
        courseName="Course title"
        discipline="WRT"
        completedDate="1 March 2026"
        credentialId="00000000-0000-0000-0000-000000000001"
        courseSlug={courseSlug}
      />
    )
  );
}

function enrollmentRow(slug: string) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    completedAt: new Date('2026-03-01T00:00:00Z'),
    student: { fullName: 'Jane Smith', email: 'jane@example.com' },
    course: {
      title: 'Course title',
      slug,
      // Polluted legacy fields: neither is IICRC approval and neither may print IICRC wording.
      iicrcDiscipline: 'WRT',
      cecHours: 14,
      level: 'Professional development',
    },
  };
}

describe('register fixtures', () => {
  it('uses one course off the register and one approved course on it', () => {
    expect(getCecApproval(NOT_APPROVED_SLUG)).toBeNull();
    expect(getCecApproval(APPROVED_SLUG)?.status).toBe('approved');
    expect(getApprovedCecHours(APPROVED_SLUG)).toBeGreaterThan(0);
  });
});

describe('certificate art IICRC and CEC wording (GP-757)', () => {
  it('a certificate for a course not on the approvals register renders no IICRC text', () => {
    const out = renderArt(NOT_APPROVED_SLUG);
    expect(out).toContain('Certificate of Completion');
    expect(out).not.toMatch(/IICRC/i);
    expect(out).not.toMatch(/\bCECs?\b/);
  });

  it('a certificate for a registry-approved course renders "Course approved for IICRC CECs" with the register hours', () => {
    const hours = getApprovedCecHours(APPROVED_SLUG)!;
    const out = renderArt(APPROVED_SLUG);
    expect(out).toContain('Course approved for IICRC CECs');
    expect(out).toContain(`${hours} IICRC CEC hour${hours === 1 ? '' : 's'}`);
  });

  it('no certificate renders "Accredited"', () => {
    for (const slug of [NOT_APPROVED_SLUG, APPROVED_SLUG]) {
      expect(renderArt(slug)).not.toMatch(/accredit/i);
    }
  });
});

describe('certificate PDF data (GP-757)', () => {
  it('a non-approved course with a polluted DB cecHours and discipline carries no CEC wording', () => {
    const data = completionCertificateDataFromEnrollment(enrollmentRow(NOT_APPROVED_SLUG));
    expect(data.courseSlug).toBe(NOT_APPROVED_SLUG);
    expect(JSON.stringify(data)).not.toMatch(/IICRC|accredit/i);
  });

  it('an approved course passes its slug through to the art', () => {
    const data = completionCertificateDataFromEnrollment(enrollmentRow(APPROVED_SLUG));
    expect(data.courseSlug).toBe(APPROVED_SLUG);
  });
});
