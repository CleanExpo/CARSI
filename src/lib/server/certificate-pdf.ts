import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { formatCecHoursForCertificate } from '@/lib/cec-display';
import { formatCredentialRef } from '@/lib/credential-format';
import { IICRC_DISCIPLINE_LONG } from '@/lib/iicrc-discipline-display';
import { resolveLmsCourseCecHours, type LmsCourseCecSource } from '@/lib/server/course-cec-hours';

const DISCIPLINE_HEX: Record<string, string> = {
  WRT: '#2490ed',
  CRT: '#26c4a0',
  ASD: '#6c63ff',
  OCT: '#9b59b6',
  CCT: '#17b8d4',
  FSRT: '#f05a35',
  AMRT: '#27ae60',
};

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Fixed baseline for the footer signature row (PDF y-axis, points from bottom). */
const FOOTER_ROW_Y = MARGIN + 52;

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

function drawProgrammeDetailsBand(
  page: PDFPage,
  opts: {
    yTop: number;
    xMid: number;
    margin: number;
    contentW: number;
    discRgb: ReturnType<typeof rgb>;
    items: ProgrammeMetric[];
    credentialRef: string;
    notice: string;
    helvetica: PDFFont;
    helveticaBold: PDFFont;
  }
): number {
  const { yTop, xMid, margin, contentW, discRgb, items, credentialRef, notice, helvetica, helveticaBold } =
    opts;

  page.drawLine({
    start: { x: margin, y: yTop },
    end: { x: PAGE_W - margin, y: yTop },
    thickness: 0.5,
    color: discRgb,
    opacity: 0.28,
  });

  let y = yTop - 14;
  drawCenteredText(page, 'PROGRAMME DETAILS', xMid, y, 6.5, helveticaBold, rgb(0.42, 0.44, 0.48));
  y -= 22;

  const colCount = Math.max(1, items.length);
  const colW = contentW / colCount;
  const labelColor = rgb(0.45, 0.47, 0.5);
  const valueColor = rgb(0.88, 0.9, 0.93);

  for (let i = 1; i < colCount; i++) {
    const dividerX = margin + colW * i;
    page.drawLine({
      start: { x: dividerX, y: y - 20 },
      end: { x: dividerX, y: y + 2 },
      thickness: 0.4,
      color: rgb(1, 1, 1),
      opacity: 0.08,
    });
  }

  items.forEach((item, i) => {
    const cx = margin + colW * i + colW / 2;
    drawCenteredText(page, item.label.toUpperCase(), cx, y, 6, helveticaBold, labelColor);
    const valLine = wrapLines(item.value, 24)[0] ?? item.value;
    const valSize = valLine.length > 26 ? 7 : 7.5;
    drawCenteredText(page, valLine, cx, y - 12, valSize, helvetica, valueColor);
  });

  y -= 30;
  drawCenteredText(page, `Credential  ${credentialRef}`, xMid, y, 6.5, helvetica, rgb(0.5, 0.52, 0.55));
  y -= 14;

  const noticeLines = wrapLines(notice, 108);
  for (const line of noticeLines.slice(0, 2)) {
    drawCenteredText(page, line, xMid, y, 6.5, helvetica, rgb(0.52, 0.54, 0.58));
    y -= 10;
  }

  return y;
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

  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const xMid = PAGE_W / 2;

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

  const arm = 14;
  const cornerInset = frameInset + 16;
  const t = 1.5;
  drawCornerBracket(page, cornerInset, PAGE_H - cornerInset, arm, t, discRgb, 'tl');
  drawCornerBracket(page, PAGE_W - cornerInset, PAGE_H - cornerInset, arm, t, discRgb, 'tr');
  drawCornerBracket(page, cornerInset, cornerInset, arm, t, discRgb, 'bl');
  drawCornerBracket(page, PAGE_W - cornerInset, cornerInset, arm, t, discRgb, 'br');

  let y = PAGE_H - MARGIN - 4;

  const logoBytes = await loadLogoPng();
  if (logoBytes) {
    const pngImage = await doc.embedPng(logoBytes);
    const maxW = 198;
    const scale = maxW / pngImage.width;
    const imgW = maxW;
    const imgH = pngImage.height * scale;
    page.drawImage(pngImage, {
      x: xMid - imgW / 2,
      y: y - imgH,
      width: imgW,
      height: imgH,
    });
    y -= imgH + 10;
  }

  drawCenteredText(
    page,
    'Centre for Applied Restoration Science & Industry',
    xMid,
    y,
    6.5,
    helvetica,
    rgb(0.5, 0.52, 0.56)
  );
  y -= 20;

  drawCenteredText(page, 'Certificate of Completion', xMid, y, 23, timesRoman, rgb(0.96, 0.96, 0.98));
  y -= 18;
  drawCenteredText(
    page,
    'Official record of achievement',
    xMid,
    y,
    8,
    helvetica,
    rgb(0.58, 0.6, 0.64)
  );
  y -= 20;

  const ruleW = 88;
  page.drawLine({
    start: { x: xMid - ruleW / 2, y },
    end: { x: xMid + ruleW / 2, y },
    thickness: 1.2,
    color: discRgb,
  });
  y -= 28;

  drawCenteredText(page, 'THIS IS TO CERTIFY THAT', xMid, y, 7.5, helveticaBold, rgb(0.58, 0.6, 0.64));
  y -= 24;

  const nameSize = 22;
  drawCenteredText(page, studentName, xMid, y, nameSize, timesItalic, rgb(126 / 255, 197 / 255, 1));
  y -= nameSize + 16;

  const bodyMuted = rgb(0.62, 0.64, 0.68);
  drawCenteredText(
    page,
    'has demonstrated the required competency and successfully completed the accredited programme',
    xMid,
    y,
    8.5,
    helvetica,
    bodyMuted
  );
  y -= 22;

  const courseLines = wrapLines(courseTitle, 72);
  for (const line of courseLines) {
    drawCenteredText(page, line, xMid, y, 13, timesBold, rgb(0.93, 0.94, 0.96));
    y -= 17;
  }
  y -= 8;

  const completedStr = formatAuDate(completedDate);
  const issuedStr = formatAuDate(issuedDate ?? completedDate);
  const credRef = credentialId ? formatCredentialRef(credentialId) : '—';
  const cecStr = formatCecHoursForCertificate(cecHours);
  const levelStr = courseLevel?.trim() ? courseLevel.trim() : 'Professional development';
  const discName = disciplineLabel(discCode);

  const bandTop = Math.max(y, FOOTER_ROW_Y + 118);
  const bandItems = [
    { label: 'Discipline', value: discName },
    { label: 'Completed', value: completedStr },
    ...(cecStr ? [{ label: 'CEC credits', value: cecStr }] : []),
    { label: 'Programme level', value: levelStr },
  ];
  drawProgrammeDetailsBand(page, {
    yTop: bandTop,
    xMid,
    margin: MARGIN,
    contentW: CONTENT_W,
    discRgb,
    items: bandItems,
    credentialRef: credRef,
    notice:
      'Designed for IICRC Continuing Education Credits (CECs) where applicable. Retain this certificate with your renewal records.',
    helvetica,
    helveticaBold,
  });

  const footerTop = FOOTER_ROW_Y + 44;
  page.drawLine({
    start: { x: MARGIN, y: footerTop + 8 },
    end: { x: PAGE_W - MARGIN, y: footerTop + 8 },
    thickness: 0.5,
    color: rgb(1, 1, 1),
    opacity: 0.07,
  });

  const colW = CONTENT_W / 3;
  const col1Center = MARGIN + colW / 2;
  const col2Center = xMid;

  drawCenteredText(page, 'Date issued', col1Center, footerTop, 7, helveticaBold, rgb(0.5, 0.52, 0.56));
  drawCenteredText(page, issuedStr, col1Center, footerTop - 14, 9, helvetica, rgb(0.78, 0.8, 0.84));
  drawCenteredText(page, 'CARSI Learning', col1Center, footerTop - 28, 6.5, helvetica, rgb(0.42, 0.44, 0.48));

  drawVerificationSeal(page, col2Center, footerTop - 18, 19, discRgb, helveticaBold, helvetica);
  drawCenteredText(
    page,
    'IICRC CEC accredited · carsi.com.au',
    col2Center,
    footerTop - 44,
    6,
    helvetica,
    rgb(0.42, 0.44, 0.48)
  );

  const sigRightX = PAGE_W - MARGIN;
  page.drawText('AUTHORISED SIGNATORY', {
    x: sigRightX - helveticaBold.widthOfTextAtSize('AUTHORISED SIGNATORY', 7),
    y: footerTop,
    size: 7,
    font: helveticaBold,
    color: rgb(0.5, 0.52, 0.56),
  });
  const sigName = 'Philip McGurk';
  const sigNameSize = 15;
  page.drawText(sigName, {
    x: sigRightX - timesItalic.widthOfTextAtSize(sigName, sigNameSize),
    y: footerTop - 18,
    size: sigNameSize,
    font: timesItalic,
    color: rgb(0.88, 0.89, 0.92),
  });
  const sigLineW = 100;
  page.drawLine({
    start: { x: sigRightX - sigLineW, y: footerTop - 34 },
    end: { x: sigRightX, y: footerTop - 34 },
    thickness: 0.5,
    color: rgb(0.55, 0.57, 0.6),
    opacity: 0.45,
  });
  const titleText = 'Training Director';
  page.drawText(titleText, {
    x: sigRightX - helvetica.widthOfTextAtSize(titleText, 7),
    y: footerTop - 46,
    size: 7,
    font: helvetica,
    color: rgb(0.5, 0.52, 0.56),
  });
  const orgText = 'Centre for Applied Restoration Science & Industry';
  page.drawText(orgText, {
    x: sigRightX - helvetica.widthOfTextAtSize(orgText, 6),
    y: footerTop - 56,
    size: 6,
    font: helvetica,
    color: rgb(0.42, 0.44, 0.48),
  });

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
      slug: string;
      iicrcDiscipline?: string | null;
      cecHours?: unknown;
      shortDescription?: string | null;
      description?: string | null;
      meta?: unknown;
      durationHours?: unknown;
      level?: string | null;
    };
  },
  verificationOrigin?: string
): CompletionCertificateData {
  void verificationOrigin;
  const studentName = row.student.fullName?.trim() || row.student.email;
  const cecSource: LmsCourseCecSource = {
    slug: row.course.slug,
    cecHours:
      row.course.cecHours != null && row.course.cecHours !== ''
        ? Number(row.course.cecHours)
        : null,
    shortDescription: row.course.shortDescription,
    description: row.course.description,
    meta: row.course.meta,
    durationHours:
      row.course.durationHours != null ? Number(row.course.durationHours) : null,
    iicrcDiscipline: row.course.iicrcDiscipline,
  };
  return {
    studentName,
    courseTitle: row.course.title,
    completedDate: row.completedAt,
    issuedDate: row.certificateIssuedAt ?? row.completedAt,
    discipline: row.course.iicrcDiscipline?.trim() || undefined,
    cecHours: resolveLmsCourseCecHours(cecSource),
    courseLevel: row.course.level,
    credentialId: row.id,
  };
}
