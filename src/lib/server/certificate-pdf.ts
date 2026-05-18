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
  durationHours?: number | null;
  courseLevel?: string | null;
  credentialId?: string;
  verificationUrl?: string;
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

type DetailRow = { label: string; value: string };

function drawDetailsPanel(
  page: PDFPage,
  opts: {
    x: number;
    yTop: number;
    width: number;
    rows: DetailRow[];
    labelFont: PDFFont;
    valueFont: PDFFont;
    discRgb: ReturnType<typeof rgb>;
    fill: ReturnType<typeof rgb>;
  }
): number {
  const { x, width, rows, labelFont, valueFont, discRgb, fill } = opts;
  const labelColW = width * 0.38;
  const padX = 14;
  const padY = 12;
  const rowH = 18;
  const panelH = padY * 2 + rows.length * rowH;

  page.drawRectangle({
    x,
    y: opts.yTop - panelH,
    width,
    height: panelH,
    color: fill,
    borderColor: discRgb,
    borderWidth: 1,
    borderOpacity: 0.35,
  });

  const labelColor = rgb(0.52, 0.54, 0.58);
  const valueColor = rgb(0.9, 0.91, 0.94);
  let rowY = opts.yTop - padY - 11;

  for (const row of rows) {
    page.drawText(row.label.toUpperCase(), {
      x: x + padX,
      y: rowY,
      size: 7,
      font: labelFont,
      color: labelColor,
    });
    const valueLines = wrapLines(row.value, 42);
    const valueText = valueLines[0] ?? '';
    page.drawText(valueText, {
      x: x + labelColW,
      y: rowY,
      size: 9,
      font: valueFont,
      color: valueColor,
    });
    rowY -= rowH;
  }

  return opts.yTop - panelH;
}

function drawVerificationSeal(
  page: PDFPage,
  cx: number,
  cy: number,
  radius: number,
  discRgb: ReturnType<typeof rgb>,
  helveticaBold: PDFFont,
  helvetica: PDFFont
) {
  page.drawCircle({
    x: cx,
    y: cy,
    size: radius * 2,
    borderColor: discRgb,
    borderWidth: 1.5,
    borderOpacity: 0.55,
    color: rgb(0.04, 0.06, 0.1),
    opacity: 0.9,
  });
  drawCenteredText(page, 'CARSI', cx, cy + 6, 9, helveticaBold, discRgb);
  drawCenteredText(page, 'VERIFIED', cx, cy - 8, 6, helvetica, rgb(0.55, 0.58, 0.62));
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
    durationHours,
    courseLevel,
    credentialId,
    verificationUrl,
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
  const contentRight = PAGE_W - MARGIN;

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
      : 'As listed in course accreditation record';
  const durationStr =
    durationHours != null && durationHours > 0
      ? `${durationHours % 1 === 0 ? durationHours : durationHours.toFixed(1)} hours · Online LMS`
      : 'Online · CARSI Learning Platform';
  const levelStr = courseLevel?.trim() ? courseLevel.trim() : 'Professional development';

  const detailRows: DetailRow[] = [
    { label: 'Programme', value: courseTitle },
    { label: 'Date of completion', value: completedStr },
    { label: 'Credential reference', value: credRef },
    {
      label: 'IICRC discipline',
      value: `${discCode} — ${disciplineLabel(discCode)}`,
    },
    { label: 'Continuing education', value: cecStr },
    { label: 'Delivery & duration', value: `${durationStr} · ${levelStr}` },
    { label: 'Issuing organisation', value: 'CARSI Learning · IICRC-aligned curriculum' },
  ];

  y = drawDetailsPanel(page, {
    x: contentLeft,
    yTop: y,
    width: CONTENT_W,
    rows: detailRows,
    labelFont: helveticaBold,
    valueFont: helvetica,
    discRgb,
    fill: panelFill,
  });
  y -= 14;

  const noticeH = 28;
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
  const col3Center = contentRight - colW / 2;

  drawCenteredText(page, 'Date issued', col1Center, footerTop, 7, helveticaBold, rgb(0.5, 0.52, 0.56));
  drawCenteredText(page, issuedStr, col1Center, footerTop - 14, 9, helvetica, rgb(0.78, 0.8, 0.84));

  drawVerificationSeal(page, col2Center, footerTop - 22, 26, discRgb, helveticaBold, helvetica);

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

  y = footerTop - 72;

  if (verificationUrl?.trim()) {
    const verifyLabel = 'Verify this credential:';
    const url = verificationUrl.trim();
    drawCenteredText(page, verifyLabel, xMid, y, 7, helveticaBold, rgb(0.48, 0.5, 0.54));
    y -= 11;
    const urlLines = wrapLines(url, 72);
    for (const line of urlLines.slice(0, 2)) {
      drawCenteredText(page, line, xMid, y, 7.5, helvetica, discRgb);
      y -= 10;
    }
  }

  const footerTag = 'carsi.com.au · Restoration industry education';
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
      durationHours?: unknown;
      level?: string | null;
    };
  },
  verificationOrigin?: string
): CompletionCertificateData {
  const origin = verificationOrigin?.replace(/\/$/, '') ?? '';
  const studentName = row.student.fullName?.trim() || row.student.email;
  const cec =
    row.course.cecHours != null && row.course.cecHours !== ''
      ? Number(row.course.cecHours)
      : null;
  const duration =
    row.course.durationHours != null && row.course.durationHours !== ''
      ? Number(row.course.durationHours)
      : null;

  return {
    studentName,
    courseTitle: row.course.title,
    completedDate: row.completedAt,
    issuedDate: row.certificateIssuedAt ?? row.completedAt,
    discipline: row.course.iicrcDiscipline?.trim() || undefined,
    cecHours: Number.isFinite(cec) ? cec : null,
    durationHours: Number.isFinite(duration) ? duration : null,
    courseLevel: row.course.level,
    credentialId: row.id,
    verificationUrl: origin ? `${origin}/verify/credential/${row.id}` : undefined,
  };
}
