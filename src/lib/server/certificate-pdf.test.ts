import { describe, expect, it } from 'vitest';

import { buildCompletionCertificatePdf } from './certificate-pdf';

/** First bytes of every PDF file. */
const PDF_MAGIC = '%PDF-';

function pdfHeader(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes.slice(0, 5));
}

const base = {
  courseTitle: 'Water Damage Restoration Technician',
  completedDate: new Date('2026-03-01T00:00:00Z'),
  discipline: 'WRT',
  cecHours: 14,
  courseLevel: 'Professional development',
  credentialId: '00000000-0000-0000-0000-000000000001',
};

describe('buildCompletionCertificatePdf', () => {
  it('renders a plain ASCII name (regression: existing happy path)', async () => {
    const pdf = await buildCompletionCertificatePdf({ ...base, studentName: 'Jane Smith' });
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdfHeader(pdf)).toBe(PDF_MAGIC);
  });

  it('renders a name with Māori macrons without throwing (#143)', async () => {
    // ā (U+0101) is outside WinAnsi — the pdf-lib StandardFonts would throw here.
    const pdf = await buildCompletionCertificatePdf({ ...base, studentName: 'Tāmati Ngāpō' });
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdfHeader(pdf)).toBe(PDF_MAGIC);
  });

  it('renders European diacritics and non-Latin (Cyrillic) names', async () => {
    for (const studentName of ['José Müller', 'Søren Kierkegård', 'Анна Иванова']) {
      const pdf = await buildCompletionCertificatePdf({ ...base, studentName });
      expect(pdfHeader(pdf)).toBe(PDF_MAGIC);
    }
  });

  it('renders a unicode course title without throwing', async () => {
    const pdf = await buildCompletionCertificatePdf({
      ...base,
      studentName: 'Jane Smith',
      courseTitle: 'Mātauranga Māori Restoration Práctica',
    });
    expect(pdfHeader(pdf)).toBe(PDF_MAGIC);
  });
});
