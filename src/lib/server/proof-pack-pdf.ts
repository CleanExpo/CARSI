import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const BLACK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.35, 0.35, 0.38);
const RULE = rgb(0.85, 0.86, 0.88);

export async function buildProofPackPdf(payload: ProofPackPayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([PAGE_W, PAGE_H]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

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

  const title = 'Training & CEC summary';
  page.drawText(title, {
    x: MARGIN,
    y,
    size: 18,
    font: helveticaBold,
    color: BLACK,
  });
  y -= 26;

  page.drawText('For employer, HR, or insurer evidence — IICRC CEC-approved completions on CARSI.', {
    x: MARGIN,
    y,
    size: 9,
    font: helvetica,
    color: MUTED,
  });
  y -= 28;

  page.drawText(`Learner: ${payload.learner_name}`, {
    x: MARGIN,
    y,
    size: 11,
    font: helveticaBold,
    color: BLACK,
  });
  y -= 14;
  page.drawText(`Email: ${payload.learner_email}`, { x: MARGIN, y, size: 10, font: helvetica, color: BLACK });
  y -= 14;
  page.drawText(`Issuing organisation: ${payload.issuing_organisation}`, {
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
  page.drawText(`Report generated: ${genDate}`, {
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
  page.drawText('Summary', { x: MARGIN, y, size: 12, font: helveticaBold, color: BLACK });
  y -= 18;
  page.drawText(`Completed courses: ${payload.summary.completed_courses}`, {
    x: MARGIN,
    y,
    size: 10,
    font: helvetica,
    color: BLACK,
  });
  y -= 14;
  page.drawText(`Total IICRC CEC hours (from completed courses): ${payload.summary.total_cec_hours}`, {
    x: MARGIN,
    y,
    size: 10,
    font: helvetica,
    color: BLACK,
  });
  y -= 28;

  if (payload.cec_by_discipline.length > 0) {
    ensureSpace(40 + payload.cec_by_discipline.length * 16);
    page.drawText('CEC hours by discipline', {
      x: MARGIN,
      y,
      size: 12,
      font: helveticaBold,
      color: BLACK,
    });
    y -= 16;
    for (const row of payload.cec_by_discipline) {
      ensureSpace(20);
      page.drawText(`${row.discipline}`, { x: MARGIN, y, size: 10, font: helvetica, color: BLACK });
      page.drawText(`${row.cec_hours}`, {
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
  page.drawText('Completed courses & credential IDs', {
    x: MARGIN,
    y,
    size: 12,
    font: helveticaBold,
    color: BLACK,
  });
  y -= 10;
  page.drawText('Verify each row at the URL shown (public verification).', {
    x: MARGIN,
    y,
    size: 8,
    font: helvetica,
    color: MUTED,
  });
  y -= 20;

  const colCourse = MARGIN;

  ensureSpace(22);
  page.drawText('Course / verification', { x: colCourse, y, size: 8, font: helveticaBold, color: MUTED });
  y -= 14;

  for (const c of payload.credentials) {
    const titleLines = wrapLines(c.course_title, 72);
    const metaLine = `${c.iicrc_discipline ?? '—'} · ${c.cec_hours} CEC · issued ${c.issued_date} · ID ${c.credential_id}`;
    const urlLines = wrapLines(c.verification_url, 92);
    const blockH = titleLines.length * 11 + 14 + 12 + urlLines.length * 10 + 12;
    ensureSpace(blockH);

    for (const line of titleLines) {
      page.drawText(line, { x: colCourse, y, size: 10, font: helveticaBold, color: BLACK });
      y -= 11;
    }
    page.drawText(metaLine, { x: colCourse, y, size: 8, font: helvetica, color: MUTED });
    y -= 12;
    for (const ul of urlLines) {
      page.drawText(ul, { x: colCourse, y, size: 7, font: helvetica, color: rgb(0.1, 0.45, 0.75) });
      y -= 9;
    }
    y -= 10;
  }

  if (payload.credentials.length === 0) {
    ensureSpace(20);
    page.drawText('No completed courses on record.', {
      x: MARGIN,
      y,
      size: 10,
      font: helvetica,
      color: MUTED,
    });
    y -= 20;
  }

  for (const p of doc.getPages()) {
    p.drawText('CARSI · carsi.com.au · IICRC CEC-approved provider', {
      x: MARGIN,
      y: 32,
      size: 7,
      font: helvetica,
      color: MUTED,
    });
  }

  return doc.save();
}
