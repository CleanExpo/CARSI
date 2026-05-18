import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { formatCredentialRef } from '@/lib/credential-format';
import { IICRC_DISCIPLINE_LONG } from '@/lib/iicrc-discipline-display';

const DISCIPLINE_HEX: Record<string, string> = {
  WRT: '#2490ed',
  CRT: '#26c4a0',
  ASD: '#6c63ff',
  OCT: '#9b59b6',
  CCT: '#17b8d4',
  FSRT: '#f05a35',
  AMRT: '#27ae60',
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 44;
const CONTENT_W = PAGE_W - MARGIN * 2;

export type CompletionCertificateData = {
  studentName: string;
  courseTitle: string;
  completedDate: Date;
  issuedDate?: Date;
  discipline?: string;
  cecHours?: number | null;
  courseLevel?: string | null;
  credentialId?: string;
};

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  );
}

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

function formatAuDate(d: Date): string {
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function disciplineCode(raw?: string): string {
  const c = raw?.trim().toUpperCase();
  if (!c || c === '—' || c === '-') return 'GEN';
  return c;
}

function disciplineLabel(code: string): string {
  if (code === 'GEN') return 'General restoration training';
  return IICRC_DISCIPLINE_LONG[code] ?? code;
}

async function loadLogoPng(): Promise<Uint8Array | null> {
  try {
    const p = path.join(process.cwd(), 'public', 'logo', 'logo1.png');
    return await readFile(p);
  } catch {
    return null;
  }
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  xMid: number,
  yBaseline: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: xMid - w / 2,
    y: yBaseline,
    size,
    font,
    color,
  });
}

function drawCornerBracket(
  page: PDFPage,
  cx: number,
  cy: number,
  arm: number,
  thickness: number,
  color: ReturnType<typeof rgb>,
  corner: 'tl' | 'tr' | 'bl' | 'br'
) {
  const segments: Record<typeof corner, [{ x: number; y: number }, { x: number; y: number }]> = {
    tl: [
      { x: cx, y: cy },
      { x: cx + arm, y: cy },
    ],
    tr: [
      { x: cx, y: cy },
      { x: cx - arm, y: cy },
    ],
    bl: [
      { x: cx, y: cy },
      { x: cx + arm, y: cy },
    ],
    br: [
      { x: cx, y: cy },
      { x: cx - arm, y: cy },
    ],
  };
  const vertical: Record<typeof corner, [{ x: number; y: number }, { x: number; y: number }]> = {
    tl: [
      { x: cx, y: cy },
      { x: cx, y: cy - arm },
    ],
    tr: [
      { x: cx, y: cy },
      { x: cx, y: cy - arm },
    ],
    bl: [
      { x: cx, y: cy },
      { x: cx, y: cy + arm },
    ],
    br: [
      { x: cx, y: cy },
      { x: cx, y: cy + arm },
    ],
  };
  page.drawLine({ start: segments[corner][0], end: segments[corner][1], thickness, color });
  page.drawLine({ start: vertical[corner][0], end: vertical[corner][1], thickness, color });
}

type ProgrammeMetric = { label: string; value: string };

function drawProgrammeRecordPanel(
  page: PDFPage,
  opts: {
    x: number;
    yTop: number;
    width: number;
    discCode: string;
    discRgb: ReturnType<typeof rgb>;
    fill: ReturnType<typeof rgb>;
    disciplineName: string;
    metrics: ProgrammeMetric[];
    credentialRef: string;
    helvetica: PDFFont;
    helveticaBold: PDFFont;
  }
): number {
  const { x, width, discCode, discRgb, fill, disciplineName, metrics, credentialRef } = opts;
  const headerH = 22;
  const subHeaderH = 16;
  const cellH = 34;
  const footerH = 20;
  const metricCount = Math.max(1, opts.metrics.length);
  const gridRows = 1;
  const panelH = headerH + subHeaderH + cellH * gridRows + footerH;
  const yBottom = opts.yTop - panelH;

  page.drawRectangle({
    x,
    y: yBottom,
    width,
    height: panelH,
    color: fill,
    borderColor: discRgb,
    borderWidth: 1,
    borderOpacity: 0.4,
  });
  page.drawRectangle({
    x,
    y: opts.yTop - headerH,
    width,
    height: headerH,
    color: discRgb,
    opacity: 0.18,
    borderWidth: 0,
  });

  const padX = 14;
  page.drawText('PROGRAMME RECORD', {
    x: x + padX,
    y: opts.yTop - headerH + 9,
    size: 7,
    font: opts.helveticaBold,
    color: rgb(0.72, 0.74, 0.78),
  });

  const badgeText = discCode;
  const badgeSize = 8;
  const badgePadX = 8;
  const badgeW = opts.helveticaBold.widthOfTextAtSize(badgeText, badgeSize) + badgePadX * 2;
  const badgeH = 14;
  const badgeX = x + width - padX - badgeW;
  const badgeY = opts.yTop - headerH + 6;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: discRgb,
  });
  page.drawText(badgeText, {
    x: badgeX + badgePadX,
    y: badgeY + 3,
    size: badgeSize,
    font: opts.helveticaBold,
    color: rgb(1, 1, 1),
  });

  const subY = opts.yTop - headerH - subHeaderH;
  page.drawText(disciplineName, {
    x: x + padX,
    y: subY + 5,
    size: 8,
    font: opts.helvetica,
    color: rgb(0.78, 0.8, 0.84),
  });

  const gridTop = subY;
  const colW = width / metricCount;
  const labelColor = rgb(0.5, 0.52, 0.56);
  const valueColor = rgb(0.92, 0.93, 0.96);
  const cellY = gridTop - cellH;

  for (let i = 1; i < metricCount; i++) {
    const dividerX = x + colW * i;
    page.drawLine({
      start: { x: dividerX, y: cellY },
      end: { x: dividerX, y: gridTop },
      thickness: 0.5,
      color: discRgb,
      opacity: 0.22,
    });
  }

  metrics.forEach((m, i) => {
    const cellX = x + colW * i;
    const cellPad = i === 0 ? padX : 10;
    page.drawText(m.label.toUpperCase(), {
      x: cellX + cellPad,
      y: cellY + cellH - 20,
      size: 6.5,
      font: opts.helveticaBold,
      color: labelColor,
    });
    const maxChars = Math.floor((colW - cellPad * 2) / 5);
    const valLines = wrapLines(m.value, Math.max(14, maxChars));
    const valueSize = valLines[0]!.length > 22 ? 8 : 9;
    page.drawText(valLines[0] ?? m.value, {
      x: cellX + cellPad,
      y: cellY + cellH - 32,
      size: valueSize,
      font: opts.helveticaBold,
      color: valueColor,
    });
    if (valLines[1]) {
      page.drawText(valLines[1], {
        x: cellX + cellPad,
        y: cellY + 6,
        size: 7.5,
        font: opts.helvetica,
        color: rgb(0.75, 0.77, 0.8),
      });
    }
  });

  page.drawText(`Credential  ${credentialRef}`, {
    x: x + padX,
    y: yBottom + 7,
    size: 7,
    font: opts.helvetica,
    color: rgb(0.55, 0.57, 0.62),
  });

  return yBottom;
}

function drawVerificationSeal(
  page: PDFPage,
  cx: number,
  cy: number,
  outerR: number,
  discRgb: ReturnType<typeof rgb>,
  helveticaBold: PDFFont,
  helvetica: PDFFont
) {
  page.drawCircle({
    x: cx,
    y: cy,
    size: outerR * 2,
    borderColor: discRgb,
    borderWidth: 1.5,
    borderOpacity: 0.65,
    color: rgb(0.04, 0.06, 0.1),
    opacity: 0.98,
  });
  page.drawCircle({
    x: cx,
    y: cy,
    size: (outerR - 4) * 2,
    borderColor: discRgb,
    borderWidth: 0.5,
    borderOpacity: 0.35,
    color: discRgb,
    opacity: 0.1,
  });

  drawCenteredText(page, 'CARSI', cx, cy + 8, 10, helveticaBold, discRgb);
  drawCenteredText(page, 'VERIFIED', cx, cy - 3, 6, helveticaBold, rgb(0.85, 0.87, 0.9));
  drawCenteredText(page, 'COMPLETION', cx, cy - 12, 5, helvetica, rgb(0.55, 0.58, 0.62));
  drawCenteredText(page, 'IICRC CEC', cx, cy - 21, 5, helveticaBold, discRgb);
}

export async function buildCompletionCertificatePdf(
  params: CompletionCertificateData
): Promise<Uint8Array> {
  const {
    studentName,
    courseTitle,
    completedDate,
    issuedDate,
    discipline: disciplineRaw,
    cecHours,
    courseLevel,
    credentialId,
  } = params;

  const discCode = disciplineCode(disciplineRaw);
  const discHex = DISCIPLINE_HEX[discCode] ?? '#2490ed';
  const discRgb = hexToRgb(discHex);
  const cardFill = rgb(10 / 255, 14 / 255, 20 / 255);
  const panelFill = rgb(14 / 255, 18 / 255, 26 / 255);

  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const xMid = PAGE_W / 2;
  const contentLeft = MARGIN;

  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const timesRoman = await doc.embedFont(StandardFonts.TimesRoman);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cardFill });
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: discRgb,
    opacity: 0.08,
  });

  const frameInset = 10;
  const borderOp = 0.45;
  page.drawRectangle({
    x: frameInset,
    y: frameInset,
    width: PAGE_W - frameInset * 2,
    height: PAGE_H - frameInset * 2,
    borderColor: discRgb,
    borderWidth: 1.5,
    borderOpacity: borderOp,
    color: cardFill,
    opacity: 0,
  });
  page.drawRectangle({
    x: frameInset + 6,
    y: frameInset + 6,
    width: PAGE_W - (frameInset + 6) * 2,
    height: PAGE_H - (frameInset + 6) * 2,
    borderColor: discRgb,
    borderWidth: 0.5,
    borderOpacity: 0.22,
    color: cardFill,
    opacity: 0,
  });

  const arm = 16;
  const cornerInset = frameInset + 18;
  const t = 1.5;
  drawCornerBracket(page, cornerInset, PAGE_H - cornerInset, arm, t, discRgb, 'tl');
  drawCornerBracket(page, PAGE_W - cornerInset, PAGE_H - cornerInset, arm, t, discRgb, 'tr');
  drawCornerBracket(page, cornerInset, cornerInset, arm, t, discRgb, 'bl');
  drawCornerBracket(page, PAGE_W - cornerInset, cornerInset, arm, t, discRgb, 'br');

  let y = PAGE_H - MARGIN - 8;

  const logoBytes = await loadLogoPng();
  if (logoBytes) {
    const pngImage = await doc.embedPng(logoBytes);
    const maxW = 168;
    const scale = maxW / pngImage.width;
    const imgW = maxW;
    const imgH = pngImage.height * scale;
    page.drawImage(pngImage, {
      x: xMid - imgW / 2,
      y: y - imgH,
      width: imgW,
      height: imgH,
    });
    y -= imgH + 6;
  }

  drawCenteredText(
    page,
    'Centre for Applied Restoration Science & Industry',
    xMid,
    y,
    7,
    helvetica,
    rgb(0.5, 0.52, 0.56)
  );
  y -= 22;

  drawCenteredText(page, 'Certificate of Completion', xMid, y, 24, timesRoman, rgb(0.96, 0.96, 0.98));
  y -= 14;
  drawCenteredText(
    page,
    'Official record of achievement',
    xMid,
    y,
    9,
    helvetica,
    rgb(0.58, 0.6, 0.64)
  );
  y -= 10;

  const ruleW = 120;
  page.drawLine({
    start: { x: xMid - ruleW / 2, y },
    end: { x: xMid + ruleW / 2, y },
    thickness: 1.2,
    color: discRgb,
  });
  y -= 26;

  drawCenteredText(page, 'THIS IS TO CERTIFY THAT', xMid, y, 8, helveticaBold, rgb(0.58, 0.6, 0.64));
  y -= 22;

  const nameSize = 20;
  drawCenteredText(page, studentName, xMid, y, nameSize, timesItalic, rgb(126 / 255, 197 / 255, 1));
  y -= nameSize + 12;

  const bodyMuted = rgb(0.62, 0.64, 0.68);
  const bodyLines = [
    'has demonstrated the required competency and',
    'successfully completed the accredited programme',
  ];
  for (const line of bodyLines) {
    drawCenteredText(page, line, xMid, y, 9, helvetica, bodyMuted);
    y -= 12;
  }
  y -= 6;

  const courseLines = wrapLines(courseTitle, 52);
  for (const line of courseLines) {
    drawCenteredText(page, line, xMid, y, 15, timesBold, rgb(0.93, 0.94, 0.96));
    y -= 17;
  }
  y -= 8;

  const completedStr = formatAuDate(completedDate);
  const issuedStr = formatAuDate(issuedDate ?? completedDate);
  const credRef = credentialId ? formatCredentialRef(credentialId) : '—';
  const cecStr =
    cecHours != null && cecHours > 0
      ? `${Number(cecHours) % 1 === 0 ? cecHours : cecHours.toFixed(1)} IICRC CEC hour${cecHours === 1 ? '' : 's'}`
      : 'Per course listing';
  const levelStr = courseLevel?.trim() ? courseLevel.trim() : 'Professional development';

  y = drawProgrammeRecordPanel(page, {
    x: contentLeft,
    yTop: y,
    width: CONTENT_W,
    discCode,
    discRgb,
    fill: panelFill,
    disciplineName: disciplineLabel(discCode),
    metrics: [
      { label: 'Completed', value: completedStr },
      { label: 'CEC credits', value: cecStr },
      { label: 'Programme level', value: levelStr },
    ],
    credentialRef: credRef,
    helvetica,
    helveticaBold,
  });
  y -= 14;

  const noticeH = 24;
  page.drawRectangle({
    x: contentLeft,
    y: y - noticeH,
    width: CONTENT_W,
    height: noticeH,
    color: discRgb,
    opacity: 0.14,
    borderWidth: 0,
  });
  const notice =
    'This programme is designed for IICRC Continuing Education Credits (CECs) where applicable. ' +
    'Maintain this certificate with your renewal records.';
  const noticeLines = wrapLines(notice, 88);
  let noticeY = y - 10;
  for (const line of noticeLines.slice(0, 2)) {
    drawCenteredText(page, line, xMid, noticeY, 7.5, helvetica, rgb(0.72, 0.74, 0.78));
    noticeY -= 10;
  }
  y -= noticeH + 18;

  const footerTop = y;
  const colW = CONTENT_W / 3;
  const col1Center = contentLeft + colW / 2;
  const col2Center = contentLeft + colW + colW / 2;
  const col3Center = PAGE_W - MARGIN - colW / 2;

  drawCenteredText(page, 'Date issued', col1Center, footerTop, 7, helveticaBold, rgb(0.5, 0.52, 0.56));
  drawCenteredText(page, issuedStr, col1Center, footerTop - 14, 9, helvetica, rgb(0.78, 0.8, 0.84));

  drawVerificationSeal(page, col2Center, footerTop - 24, 22, discRgb, helveticaBold, helvetica);

  drawCenteredText(page, 'Authorised signatory', col3Center, footerTop, 7, helveticaBold, rgb(0.5, 0.52, 0.56));
  drawCenteredText(page, 'Philip McGurk', col3Center, footerTop - 20, 16, timesItalic, rgb(0.88, 0.89, 0.92));
  const sigLineW = 110;
  page.drawLine({
    start: { x: col3Center - sigLineW / 2, y: footerTop - 38 },
    end: { x: col3Center + sigLineW / 2, y: footerTop - 38 },
    thickness: 0.5,
    color: rgb(0.55, 0.57, 0.6),
    opacity: 0.5,
  });
  drawCenteredText(page, 'Training Director', col3Center, footerTop - 50, 7, helvetica, rgb(0.5, 0.52, 0.56));

  const footerTag = 'CARSI Learning · carsi.com.au · IICRC-aligned restoration education';
  drawCenteredText(page, footerTag, xMid, MARGIN - 4, 6.5, helvetica, rgb(0.42, 0.44, 0.48));

  return doc.save();
}

/** Map enrollment + course row to PDF builder input (shared by download + public verify). */
export function completionCertificateDataFromEnrollment(
  row: {
    id: string;
    completedAt: Date;
    certificateIssuedAt?: Date | null;
    student: { fullName: string | null; email: string };
    course: {
      title: string;
      iicrcDiscipline: string | null;
      cecHours?: unknown;
      level?: string | null;
    };
  },
  verificationOrigin?: string
): CompletionCertificateData {
  void verificationOrigin;
  const studentName = row.student.fullName?.trim() || row.student.email;
  const cec =
    row.course.cecHours != null && row.course.cecHours !== ''
      ? Number(row.course.cecHours)
      : null;
  return {
    studentName,
    courseTitle: row.course.title,
    completedDate: row.completedAt,
    issuedDate: row.certificateIssuedAt ?? row.completedAt,
    discipline: row.course.iicrcDiscipline?.trim() || undefined,
    cecHours: Number.isFinite(cec) ? cec : null,
    courseLevel: row.course.level,
    credentialId: row.id,
  };
}
