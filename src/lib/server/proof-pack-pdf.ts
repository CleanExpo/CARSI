import { readFile } from 'node:fs/promises';
import path from 'node:path';

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { APPROVED_CEC_BY_DISCIPLINE_HEADING, approvedCecHoursLine } from '@/lib/proof-pack-cec-wording';
import type { ProofPackPayload } from '@/types/proof-pack';

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function loadLogoPng(): Promise<Uint8Array | null> {
  try {
    const p = path.join(process.cwd(), 'public', 'logo', 'logo1.png');
    return await readFile(p);
  } catch {
    return null;
  }
}

/**
 * Unicode fallback. pdf-lib StandardFonts encode via WinAnsi and THROW on any codepoint outside
 * it, so a learner named Tāmati Ngāpō, a Cyrillic name or a non-Latin reference title would turn
 * the proof-pack into a 500. Every string is drawn through `fontFor`: Helvetica when WinAnsi can
 * encode it (Latin transcripts render exactly as before), otherwise Noto Sans
 * (public/fonts/NotoSans-Regular.ttf, copied into the runtime image by deploy/Dockerfile).
 *
 * The face is embedded WHOLE, and only when a payload string needs it. pdf-lib's `subset: true`
 * produced a corrupt font program with this file (glyph reads past the end of the buffer), so the
 * PDF showed blanks for "Tāmati" while its ToUnicode CMap still looked right; the test reads the
 * embedded glyph outlines back to pin that. Cost: about 1.3 MB on a non-Latin transcript only.
 */
let notoBytesCache: Promise<Uint8Array | null> | null = null;

function loadNotoBytes(): Promise<Uint8Array | null> {
  notoBytesCache ??= readFile(path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf')).catch(
    () => null
  );
  return notoBytesCache;
}

function canEncode(font: PDFFont, text: string): boolean {
  try {
    font.encodeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The font to draw `text` in: the preferred standard font, else the Noto fallback. */
export function fontFor(text: string, preferred: PDFFont, fallback: PDFFont | null): PDFFont | null {
  if (canEncode(preferred, text)) return preferred;
  return fallback;
}

/** Last resort when the fallback face is unavailable: replace what WinAnsi cannot encode. */
function toEncodable(font: PDFFont, text: string): string {
  return Array.from(text, (ch) => (canEncode(font, ch) ? ch : '?')).join('');
}

/** Split a string with no spaces (a URL) into fixed-width lines without losing characters. */
function chunkLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) lines.push(text.slice(i, i + maxChars));
  return lines.length ? lines : [''];
}

/** Word-wrap, then hard-split any word longer than a line (never truncates). */
function wrapFull(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean).flatMap((w) => chunkLines(w, maxChars));
  return wrapLines(words.join(' '), maxChars);
}

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const BLACK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.35, 0.35, 0.38);
const RULE = rgb(0.85, 0.86, 0.88);

export async function buildProofPackPdf(payload: ProofPackPayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  let page = doc.addPage([PAGE_W, PAGE_H]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  // Embed the fallback only when some payload string needs it, so a Latin-only transcript carries
  // no Noto face at all. Any string missed here still cannot throw: drawText degrades it to '?'.
  const payloadText = [
    payload.learner_name,
    payload.learner_email,
    payload.issuing_organisation,
    ...(payload.cec_by_discipline ?? []).map((d) => d.discipline),
    ...payload.credentials.flatMap((c) => [
      c.course_title,
      c.iicrc_discipline ?? '',
      c.credential_id,
      c.verification_url,
      ...c.references.flatMap((r) => [r.label, r.url ?? '', r.read_on ?? '']),
    ]),
  ];
  const needsFallback = payloadText.some(
    (t) => !canEncode(helvetica, t) || !canEncode(helveticaBold, t)
  );
  const notoBytes = needsFallback ? await loadNotoBytes() : null;
  let noto: PDFFont | null = null;
  if (notoBytes) {
    try {
      noto = await doc.embedFont(notoBytes);
    } catch {
      noto = null;
    }
  }

  type DrawOptions = NonNullable<Parameters<PDFPage['drawText']>[1]> & { font: PDFFont };
  const drawText = (target: PDFPage, text: string, opts: DrawOptions) => {
    const font = fontFor(text, opts.font, noto);
    if (font) target.drawText(text, { ...opts, font });
    else target.drawText(toEncodable(opts.font, text), opts);
  };

  let y = PAGE_H - MARGIN;
  const FOOTER_RESERVE = 44;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + FOOTER_RESERVE) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const logoBytes = await loadLogoPng();
  if (logoBytes) {
    try {
      const img = await doc.embedPng(logoBytes);
      const w = 140;
      const scale = w / img.width;
      const h = img.height * scale;
      page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
      y -= h + 16;
    } catch {
      y -= 4;
    }
  }

  // GP-748: the title, subtitle and footer name no IICRC and no CEC; those appear only in the
  // approved-course lines below, and only when the learner has an approved course.
  const title = 'Training summary';
  drawText(page, title, {
    x: MARGIN,
    y,
    size: 18,
    font: helveticaBold,
    color: BLACK,
  });
  y -= 26;

  drawText(page, 'For employer, HR, or insurer evidence: course completions on CARSI.', {
    x: MARGIN,
    y,
    size: 9,
    font: helvetica,
    color: MUTED,
  });
  y -= 28;

  drawText(page, `Learner: ${payload.learner_name}`, {
    x: MARGIN,
    y,
    size: 11,
    font: helveticaBold,
    color: BLACK,
  });
  y -= 14;
  drawText(page, `Email: ${payload.learner_email}`, { x: MARGIN, y, size: 10, font: helvetica, color: BLACK });
  y -= 14;
  drawText(page, `Issuing organisation: ${payload.issuing_organisation}`, {
    x: MARGIN,
    y,
    size: 10,
    font: helvetica,
    color: BLACK,
  });
  y -= 14;
  const genDate = new Date(payload.generated_at).toLocaleString('en-AU', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  drawText(page, `Report generated: ${genDate}`, {
    x: MARGIN,
    y,
    size: 9,
    font: helvetica,
    color: MUTED,
  });
  y -= 28;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: RULE,
  });
  y -= 20;

  ensureSpace(80);
  drawText(page, 'Summary', { x: MARGIN, y, size: 12, font: helveticaBold, color: BLACK });
  y -= 18;
  drawText(page, `Completed courses: ${payload.summary.completed_courses}`, {
    x: MARGIN,
    y,
    size: 10,
    font: helvetica,
    color: BLACK,
  });
  y -= 14;
  // GP-748 / GP-704: the payload carries a CEC total only when a completed course is in
  // data/seed/cec-approvals.json, and the line takes its wording from approved-wording.ts.
  if (payload.summary.total_cec_hours != null) {
    drawText(page, approvedCecHoursLine(payload.summary.total_cec_hours), {
      x: MARGIN,
      y,
      size: 10,
      font: helvetica,
      color: BLACK,
    });
    y -= 14;
  }
  y -= 14;

  const cecByDiscipline = payload.cec_by_discipline ?? [];
  if (cecByDiscipline.length > 0) {
    ensureSpace(40 + cecByDiscipline.length * 16);
    drawText(page, APPROVED_CEC_BY_DISCIPLINE_HEADING, {
      x: MARGIN,
      y,
      size: 12,
      font: helveticaBold,
      color: BLACK,
    });
    y -= 16;
    for (const row of cecByDiscipline) {
      ensureSpace(20);
      drawText(page, `${row.discipline}`, { x: MARGIN, y, size: 10, font: helvetica, color: BLACK });
      drawText(page, `${row.cec_hours}`, {
        x: PAGE_W - MARGIN - 40,
        y,
        size: 10,
        font: helvetica,
        color: BLACK,
      });
      y -= 14;
    }
    y -= 12;
  }

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: RULE,
  });
  y -= 22;

  ensureSpace(36);
  drawText(page, 'Completed courses & credential IDs', {
    x: MARGIN,
    y,
    size: 12,
    font: helveticaBold,
    color: BLACK,
  });
  y -= 10;
  drawText(page, 'Verify each row at the URL shown (public verification).', {
    x: MARGIN,
    y,
    size: 8,
    font: helvetica,
    color: MUTED,
  });
  y -= 20;

  const colCourse = MARGIN;

  ensureSpace(22);
  drawText(page, 'Course / verification', { x: colCourse, y, size: 8, font: helveticaBold, color: MUTED });
  y -= 14;

  for (const c of payload.credentials) {
    const titleLines = wrapLines(c.course_title, 72);
    // GP-748: the hours part exists only for a course in the approvals registry; every other row
    // shows the issue date and credential ID only.
    const cecPart =
      c.cec_hours != null
        ? [c.iicrc_discipline?.trim() || null, approvedCecHoursLine(c.cec_hours)].filter(Boolean).join(' · ')
        : null;
    const metaLine = [cecPart, `issued ${c.issued_date}`, `ID ${c.credential_id}`].filter(Boolean).join(' · ');
    const urlLines = wrapLines(c.verification_url, 92);
    const blockH = titleLines.length * 11 + 14 + 12 + urlLines.length * 10 + 12;
    ensureSpace(blockH);

    for (const line of titleLines) {
      drawText(page, line, { x: colCourse, y, size: 10, font: helveticaBold, color: BLACK });
      y -= 11;
    }
    drawText(page, metaLine, { x: colCourse, y, size: 8, font: helvetica, color: MUTED });
    y -= 12;
    for (const ul of urlLines) {
      drawText(page, ul, { x: colCourse, y, size: 7, font: helvetica, color: rgb(0.1, 0.45, 0.75) });
      y -= 9;
    }

    // BACKLOG #26: the reference material this course cites — citations and links only.
    if (c.references.length > 0) {
      y -= 4;
      ensureSpace(24);
      drawText(page, 'References cited in this course', {
        x: colCourse + 8,
        y,
        size: 8,
        font: helveticaBold,
        color: MUTED,
      });
      y -= 11;
      for (const ref of c.references) {
        const isPdf = ref.url ? /\.pdf(?:$|[?#])/i.test(ref.url) : false;
        const tail = [isPdf ? 'PDF' : null, ref.read_on ? `read ${ref.read_on}` : null]
          .filter(Boolean)
          .join(', ');
        const labelLines = wrapFull(`• ${ref.label}${tail ? ` (${tail})` : ''}`, 96);
        const refUrlLines = ref.url ? chunkLines(ref.url, 104) : [];
        ensureSpace(labelLines.length * 9 + refUrlLines.length * 8 + 4);
        for (const line of labelLines) {
          drawText(page, line, { x: colCourse + 8, y, size: 7.5, font: helvetica, color: BLACK });
          y -= 9;
        }
        for (const ul of refUrlLines) {
          drawText(page, ul, { x: colCourse + 14, y, size: 6.5, font: helvetica, color: rgb(0.1, 0.45, 0.75) });
          y -= 8;
        }
        y -= 2;
      }
    }
    y -= 10;
  }

  if (payload.credentials.length === 0) {
    ensureSpace(20);
    drawText(page, 'No completed courses on record.', {
      x: MARGIN,
      y,
      size: 10,
      font: helvetica,
      color: MUTED,
    });
    y -= 20;
  }

  for (const p of doc.getPages()) {
    drawText(p, 'CARSI · carsi.com.au · course completions', {
      x: MARGIN,
      y: 32,
      size: 7,
      font: helvetica,
      color: MUTED,
    });
  }

  return doc.save();
}
