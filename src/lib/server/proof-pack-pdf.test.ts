import fontkit from '@pdf-lib/fontkit';
import { PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import type { ProofPackCredentialRow, ProofPackPayload } from '@/types/proof-pack';

import { buildProofPackPdf } from './proof-pack-pdf';

// Taken from data/seo/course-references.index.json.
const QBCC_PDF =
  'https://www.qbcc.qld.gov.au/sites/default/files/2022-01/guide-contractor-rebuilding-after-flood.pdf';

// Synthetic, and deliberately longer than one drawn line (104 characters).
const LONG_URL =
  'https://www.example.gov.au/publications/restoration/a-very-long-path-segment-for-wrapping/guidance-document-2026.pdf';

function credential(over: Partial<ProofPackCredentialRow> = {}): ProofPackCredentialRow {
  return {
    credential_id: 'enr-1',
    course_title: 'Moisture Meters, Readings and Dry Standards',
    issued_date: '2026-11-01',
    verification_url: 'https://carsi.com.au/verify/credential/enr-1',
    references: [],
    ...over,
  };
}

function payload(credentials: ProofPackCredentialRow[], learner = 'Sam Example'): ProofPackPayload {
  return {
    schema_version: 2,
    learner_name: learner,
    learner_email: 'sam@example.com',
    issuing_organisation: 'CARSI Learning',
    generated_at: '2026-11-23T00:00:00.000Z',
    summary: { completed_courses: credentials.length },
    credentials,
  };
}

/** Every decoded stream in the PDF, as latin1 text. */
async function streams(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  const out: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      out.push(Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1'));
    }
  }
  return out;
}

/** Every `<hex> Tj` in the content streams, with the font resource selected when it was drawn. */
async function drawnRuns(bytes: Uint8Array): Promise<{ font: string; hex: string }[]> {
  const runs: { font: string; hex: string }[] = [];
  for (const s of await streams(bytes)) {
    let font = '';
    for (const m of s.matchAll(/\/(\S+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>\s*Tj/g)) {
      if (m[1]) font = m[1];
      else runs.push({ font, hex: m[2] });
    }
  }
  return runs;
}

const isNoto = (font: string) => font.startsWith('NotoSans');

/**
 * Text drawn in a standard (WinAnsi) font: pdf-lib writes it as `<hex> Tj`. Decoding the hex gives
 * back what the reader sees, so a silently dropped string fails here (not just "did not throw").
 */
async function drawnLatinText(bytes: Uint8Array): Promise<string> {
  return (await drawnRuns(bytes))
    .filter((r) => !isNoto(r.font))
    .map((r) => Buffer.from(r.hex, 'hex').toString('latin1'))
    .join('\n');
}

/**
 * What the Noto fallback actually drew. Glyph ids come from the content stream (Identity-H, four
 * hex digits each), codepoints from the face's ToUnicode CMap, and every drawn non-space glyph
 * must have an outline in the EMBEDDED font program. The outline check is the one that matters:
 * pdf-lib's `subset: true` wrote a correct-looking CMap over a corrupt font program, so the PDF
 * showed blanks where "Tāmati" should be.
 */
async function notoDrawn(bytes: Uint8Array): Promise<{ codepoints: Set<string>; noOutline: string[] }> {
  const doc = await PDFDocument.load(bytes);
  const cmap = new Map<number, string>();
  for (const s of await streams(bytes)) {
    if (!s.includes('begincmap')) continue;
    for (const m of s.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]{4,})>/g)) {
      cmap.set(parseInt(m[1], 16), m[2].toUpperCase());
    }
  }
  const gids = new Set<number>();
  for (const r of await drawnRuns(bytes)) {
    if (!isNoto(r.font)) continue;
    for (let i = 0; i + 4 <= r.hex.length; i += 4) gids.add(parseInt(r.hex.slice(i, i + 4), 16));
  }
  let program: ReturnType<typeof fontkit.create> | null = null;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const file = obj.get(PDFName.of('FontFile2'));
    if (!file) continue;
    program = fontkit.create(
      Buffer.from(decodePDFRawStream(doc.context.lookup(file) as PDFRawStream).decode())
    );
  }
  const codepoints = new Set<string>();
  const noOutline: string[] = [];
  for (const gid of gids) {
    const cp = cmap.get(gid) ?? `gid:${gid}`;
    codepoints.add(cp);
    if (cp === '0020') continue;
    try {
      if (!program || program.getGlyph(gid).path.commands.length === 0) noOutline.push(cp);
    } catch {
      noOutline.push(cp);
    }
  }
  return { codepoints, noOutline };
}

/** How many embedded TrueType font programs the PDF carries. */
async function embeddedFontPrograms(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  let n = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.get(PDFName.of('FontFile2'))) n += 1;
  }
  return n;
}

describe('buildProofPackPdf — course references (BACKLOG #26)', () => {
  it('draws the references for a completed course: label, link and read date', async () => {
    const bytes = await buildProofPackPdf(
      payload([
        credential({
          references: [
            {
              label: "Queensland Building and Construction Commission, A contractor's guide to rebuilding after a flood",
              url: QBCC_PDF,
              read_on: '20/11/2026',
            },
            { label: 'AS/NZS 3760:2022 In-service safety inspection', url: null, read_on: null },
            { label: 'Long-link guidance', url: LONG_URL, read_on: null },
          ],
        }),
      ])
    );
    const text = await drawnLatinText(bytes);
    expect(text).toContain('References cited in this course');
    expect(text).toContain("Queensland Building and Construction Commission, A contractor's guide");
    // A linked public PDF is flagged as one; it is linked, never embedded.
    expect(text).toContain('(PDF, read 20/11/2026)');
    expect(text).toContain('AS/NZS 3760:2022 In-service safety inspection');
    // Links are drawn whole; a long one is wrapped, never truncated: every character of it is drawn.
    expect(text).toContain(QBCC_PDF);
    expect(LONG_URL.length).toBeGreaterThan(104);
    expect(text.replace(/\n/g, '')).toContain(LONG_URL);
  });

  it('a course with no references adds no references section', async () => {
    const bytes = await buildProofPackPdf(payload([credential({ references: [] })]));
    const text = await drawnLatinText(bytes);
    expect(text).toContain('Moisture Meters, Readings and Dry Standards');
    expect(text).not.toContain('References cited');
  });

  it('renders a non-Latin-1 reference title through the Noto fallback instead of throwing', async () => {
    const bytes = await buildProofPackPdf(
      payload([
        credential({
          references: [
            { label: 'Te Kāwanatanga o Aotearoa, Ōritetanga guidance', url: null, read_on: null },
            { label: 'Справочник по сушке', url: null, read_on: null },
          ],
        }),
      ])
    );
    const noto = await notoDrawn(bytes);
    for (const cp of ['0101', '014C', '0421', '043F', '0448']) expect(noto.codepoints).toContain(cp);
    expect(noto.noOutline).toEqual([]);
    // The Latin rows beside it still go through Helvetica.
    expect(await drawnLatinText(bytes)).toContain('Moisture Meters, Readings and Dry Standards');
  });

  it('renders a non-Latin-1 learner name (macron) and keeps Latin text off the fallback', async () => {
    const maori = await buildProofPackPdf(payload([credential()], 'Tāmati Ngāpō'));
    const noto = await notoDrawn(maori);
    expect(noto.codepoints).toContain('0101');
    expect(noto.codepoints).toContain('014D');
    expect(noto.noOutline).toEqual([]);

    const latin = await buildProofPackPdf(payload([credential()], 'Sam Example'));
    expect((await notoDrawn(latin)).codepoints).toEqual(new Set());
    // ...and carries no embedded face at all (the whole Noto face is about 1.3 MB).
    expect(await embeddedFontPrograms(latin)).toBe(0);
    expect(await embeddedFontPrograms(maori)).toBe(1);
  });
});
