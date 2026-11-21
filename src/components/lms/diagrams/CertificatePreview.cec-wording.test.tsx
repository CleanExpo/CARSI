import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CertificatePreview } from '@/components/lms/diagrams/CertificatePreview';
import { getApprovedCecHours } from '@/lib/seed/cec-approvals';
import { certificateCecWordingForCourse } from '@/lib/server/certificate-cec-wording';

/**
 * GP-757: the on-screen certificate (public verify page and learner dashboard) carries the same
 * IICRC rule as the printed one. Its wording is computed on the server from the approvals
 * register and passed in; the client component never decides it from an hours number.
 */

const NOT_APPROVED_SLUG = 'water-damage-restoration-fundamentals';
const APPROVED_SLUG = 'introduction-to-porous-materials-drying';

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderPreview(courseSlug: string): string {
  // Only the required wording is passed: every other prop takes its default, so a default that
  // names the IICRC would show here.
  return text(
    renderToStaticMarkup(
      <CertificatePreview cecWording={certificateCecWordingForCourse(courseSlug)} />
    )
  );
}

describe('on-screen certificate IICRC and CEC wording (GP-757)', () => {
  it('a certificate for a course not on the approvals register renders no IICRC text', () => {
    const out = renderPreview(NOT_APPROVED_SLUG);
    expect(out).toContain('Certificate of Completion');
    expect(out).not.toMatch(/IICRC/i);
    expect(out).not.toMatch(/\bCECs?\b/);
  });

  it('a certificate for a registry-approved course renders "Course approved for IICRC CECs" with the register hours', () => {
    const hours = getApprovedCecHours(APPROVED_SLUG)!;
    const out = renderPreview(APPROVED_SLUG);
    expect(out).toContain('Course approved for IICRC CECs');
    expect(out).toContain(`${hours} IICRC CEC hour${hours === 1 ? '' : 's'}`);
  });

  it('no certificate renders "Accredited"', () => {
    for (const slug of [NOT_APPROVED_SLUG, APPROVED_SLUG]) {
      expect(renderPreview(slug)).not.toMatch(/accredit/i);
    }
  });
});
