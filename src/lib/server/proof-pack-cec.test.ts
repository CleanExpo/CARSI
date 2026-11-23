/**
 * Proof-pack IICRC/CEC scope (GP-748, GP-704). The employer proof-pack (JSON and PDF) names the
 * IICRC and shows CEC hours ONLY for courses in data/seed/cec-approvals.json. A learner with no
 * approved course gets no IICRC name and no CEC line at all, in the PDF text or the JSON. Hours
 * come from the registry only: the raw `cecHours` column, duration and prose are never used.
 */
import { PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), enrollments: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: mocks.user },
    lmsEnrollment: { findMany: mocks.enrollments },
  },
}));

import { APPROVED_FOR_IICRC_CECS_LABEL } from '@/lib/iicrc/approved-wording';
import { getApprovedCecHours, isCecApprovedCourse } from '@/lib/seed/cec-approvals';

import { getProofPackPayloadForStudent } from './proof-pack';
import { buildProofPackPdf } from './proof-pack-pdf';

const APPROVED_A = 'introduction-to-porous-materials-drying';
const APPROVED_B = 'introduction-to-structural-drying-concepts';
const NOT_APPROVED = 'social-media-marketing';
const NOT_APPROVED_WITH_REFS = 'moisture-meters-readings-and-dry-standards';

/**
 * A completed enrolment. Every course carries the polluted raw columns a fail-open path would
 * read (a stored `cecHours`, a long duration, a discipline code, duration prose and meta CEC keys) so a pass proves
 * none of them is used.
 */
function enrolment(id: string, slug: string, title: string) {
  return {
    id,
    completedAt: new Date('2026-11-01T00:00:00Z'),
    certificateIssuedAt: null,
    course: {
      slug,
      title,
      cecHours: 12,
      durationHours: 40,
      iicrcDiscipline: 'WRT',
      shortDescription: 'Approx 40 Hours',
      meta: { cec_hours: 9, cec: 9 },
    },
  };
}

/** Every `<hex> Tj` run drawn in the PDF content streams, decoded to the text a reader sees. */
async function pdfText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const runs: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const s = Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1');
    for (const m of s.matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g)) {
      runs.push(Buffer.from(m[1], 'hex').toString('latin1'));
    }
  }
  return runs.join('\n');
}

/** The PDF's document information (title, subject, keywords), which a reader can also see. */
async function pdfInfo(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  return [doc.getTitle(), doc.getSubject(), doc.getKeywords(), doc.getAuthor()]
    .filter(Boolean)
    .join('\n');
}

async function build(rows: ReturnType<typeof enrolment>[]) {
  mocks.enrollments.mockResolvedValue(rows);
  const payload = await getProofPackPayloadForStudent('learner', 'https://carsi.com.au/');
  expect(payload).not.toBeNull();
  const pdf = await buildProofPackPdf(payload!);
  return {
    payload: payload!,
    json: JSON.stringify(payload),
    text: await pdfText(pdf),
    info: await pdfInfo(pdf),
  };
}

describe('proof-pack IICRC/CEC scope (GP-748, GP-704)', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://synthetic.invalid/test');
    mocks.user.mockReset().mockResolvedValue({ fullName: 'Sam Example', email: 'sam@example.com' });
    mocks.enrollments.mockReset();
  });

  it('fixtures are what the tests assume', () => {
    expect(isCecApprovedCourse(APPROVED_A)).toBe(true);
    expect(isCecApprovedCourse(APPROVED_B)).toBe(true);
    expect(isCecApprovedCourse(NOT_APPROVED)).toBe(false);
    expect(isCecApprovedCourse(NOT_APPROVED_WITH_REFS)).toBe(false);
  });

  it('a learner with only non-approved courses: no IICRC and no CEC anywhere in the PDF or the JSON', async () => {
    const { payload, json, text, info } = await build([
      enrolment('e1', NOT_APPROVED, 'Social Media Marketing'),
      enrolment('e2', NOT_APPROVED_WITH_REFS, 'Moisture Meters, Readings and Dry Standards'),
    ]);

    // The record still lists both completions.
    expect(payload.summary.completed_courses).toBe(2);
    expect(text).toContain('Social Media Marketing');
    expect(text).toContain('Moisture Meters, Readings and Dry Standards');

    for (const surface of [json, text, info]) {
      expect(surface).not.toMatch(/iicrc/i);
      expect(surface).not.toMatch(/cec/i);
      // The polluted discipline code never reaches a non-approved learner either.
      expect(surface).not.toMatch(/\bWRT\b/);
    }
  });

  it('a learner with no completed course at all: no IICRC and no CEC', async () => {
    const { json, text, info } = await build([]);
    for (const surface of [json, text, info]) {
      expect(surface).not.toMatch(/iicrc/i);
      expect(surface).not.toMatch(/cec/i);
    }
  });

  it('a learner with an approved course: the approved hours and the approved wording appear', async () => {
    const hours = getApprovedCecHours(APPROVED_A)!;
    const { payload, text } = await build([
      enrolment('e1', APPROVED_A, 'Introduction to Porous Materials Drying'),
    ]);

    expect(payload.summary.total_cec_hours).toBe(hours);
    expect(payload.credentials[0].cec_hours).toBe(hours);

    const unit = hours === 1 ? 'hour' : 'hours';
    expect(text).toContain(`${APPROVED_FOR_IICRC_CECS_LABEL}: ${hours} ${unit}`);
    // The retired heading is gone.
    expect(text).not.toContain('Total IICRC CEC hours');
  });

  it('mixed: only the approved courses are counted, and the non-approved row carries no CEC', async () => {
    const expected = getApprovedCecHours(APPROVED_A)! + getApprovedCecHours(APPROVED_B)!;
    const { payload, text } = await build([
      enrolment('e1', APPROVED_A, 'Introduction to Porous Materials Drying'),
      enrolment('e2', NOT_APPROVED, 'Social Media Marketing'),
      enrolment('e3', APPROVED_B, 'Introduction to Structural Drying Concepts'),
    ]);

    // 1 + 1, not 1 + 12 + 1 (the raw column) and not a duration-derived figure.
    expect(payload.summary.total_cec_hours).toBe(expected);
    expect(payload.summary.completed_courses).toBe(3);
    expect(payload.cec_by_discipline!.reduce((s, d) => s + d.cec_hours, 0)).toBe(expected);

    const unapproved = payload.credentials.find((c) => c.credential_id === 'e2')!;
    expect(JSON.stringify(unapproved)).not.toMatch(/iicrc|cec/i);
    expect(unapproved).not.toHaveProperty('cec_hours');
    expect(unapproved).not.toHaveProperty('iicrc_discipline');

    const unit = expected === 1 ? 'hour' : 'hours';
    expect(text).toContain(`${APPROVED_FOR_IICRC_CECS_LABEL}: ${expected} ${unit}`);
    // The non-approved course's PDF line names no IICRC and no CEC.
    const lines = text.split('\n');
    const idx = lines.indexOf('Social Media Marketing');
    expect(idx).toBeGreaterThan(-1);
    expect(lines[idx + 1]).not.toMatch(/iicrc|cec/i);
  });
});
