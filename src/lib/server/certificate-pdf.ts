import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/**
 * Mirrors the HSL values in `app/globals.css` for `--discipline-*-500`.
 * Server-side PDF rendering via pdf-lib needs concrete RGB, so the tokens
 * are expanded here from their canonical HSL triplets (the React side
 * consumes the same tokens through `hsl(var(--discipline-*-500))`).
 * GP-364: removed raw-hex map; derived from HSL to satisfy token sweep.
 */
const DISCIPLINE_HSL: Record<string, [number, number, number]> = {
  WRT: [208, 0.85, 0.54],
  CRT: [166, 0.68, 0.46],
  ASD: [243, 1.0, 0.69],
  OCT: [283, 0.39, 0.53],
  CCT: [189, 0.8, 0.46],
  FSRT: [12, 0.86, 0.57],
  AMRT: [145, 0.63, 0.42],
};

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else[r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return rgb(r1 + m, g1 + m, b1 + m);
}

function disciplineRgb(code: string) {
  const t = DISCIPLINE_HSL[code] ?? DISCIPLINE_HSL.WRT;
  return hslToRgb(t[0], t[1], t[2]);
}

function wrapCenteredLines(text: string, maxChars: number): string[] {
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

/** L-shaped corner (2 lines), same inset/arm as Tailwind `h-6 w-6` corners in preview (~18pt). */
function drawCornerBracket(
  page: PDFPage,
  cx: number,
  cy: number,
  arm: number,
  thickness: number,
  color: ReturnType<typeof rgb>,
  corner: 'tl' | 'tr' | 'bl' | 'br'
) {
  if (corner === 'tl') {
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx + arm, y: cy },
      thickness,
      color,
    });
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx, y: cy - arm },
      thickness,
      color,
    });
  } else if (corner === 'tr') {
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx - arm, y: cy },
      thickness,
      color,
    });
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx, y: cy - arm },
      thickness,
      color,
    });
  } else if (corner === 'bl') {
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx + arm, y: cy },
      thickness,
      color,
    });
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx, y: cy + arm },
      thickness,
      color,
    });
  } else {
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx - arm, y: cy },
      thickness,
      color,
    });
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx, y: cy + arm },
      thickness,
      color,
    });
  }
}

export async function buildCompletionCertificatePdf(params: {
  studentName: string;
  courseTitle: string;
  completedDate: Date;
  /** IICRC discipline code shown on badge (same as `CertificatePreview`). */
  discipline?: string;
}): Promise<Uint8Array> {
  const { studentName, courseTitle, completedDate, discipline: disciplineRaw } = params;
  const discipline = (disciplineRaw ?? 'WRT').trim() || 'WRT';
  const discRgb = disciplineRgb(discipline);
  const cardFill = rgb(10 / 255, 14 / 255, 20 / 255);

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const { width: pageW, height: pageH } = page.getSize();

  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const timesRoman = await doc.embedFont(StandardFonts.TimesRoman);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  /** Full-bleed certificate: no default white margins — entire page is the dark panel. */
  const cardLeft = 0;
  const cardBottom = 0;
  const cardRight = pageW;
  const cardTop = pageH;
  const xMid = pageW / 2;

  const frameInset = 6;

  // Base: full page #0a0e14 (covers PDF white canvas edge-to-edge)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    color: cardFill,
    borderWidth: 0,
  });

  // Subtle discipline wash over full bleed (matches React outer gradient wrapper)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    color: discRgb,
    opacity: 0.1,
    borderWidth: 0,
  });

  // Frame stroke only — no inner fill, so the page stays one continuous dark field
  const b = frameInset;
  const frameBorder = 2;
  const borderCol = discRgb;
  const borderOp = 0.4;
  page.drawLine({
    start: { x: b, y: b },
    end: { x: pageW - b, y: b },
    thickness: frameBorder,
    color: borderCol,
    opacity: borderOp,
  });
  page.drawLine({
    start: { x: b, y: pageH - b },
    end: { x: pageW - b, y: pageH - b },
    thickness: frameBorder,
    color: borderCol,
    opacity: borderOp,
  });
  page.drawLine({
    start: { x: b, y: b },
    end: { x: b, y: pageH - b },
    thickness: frameBorder,
    color: borderCol,
    opacity: borderOp,
  });
  page.drawLine({
    start: { x: pageW - b, y: b },
    end: { x: pageW - b, y: pageH - b },
    thickness: frameBorder,
    color: borderCol,
    opacity: borderOp,
  });

  const arm = 18;
  const cornerInset = frameInset + 14;
  const t = 2;
  drawCornerBracket(page, cornerInset, cardTop - cornerInset, arm, t, discRgb, 'tl');
  drawCornerBracket(page, cardRight - cornerInset, cardTop - cornerInset, arm, t, discRgb, 'tr');
  drawCornerBracket(page, cornerInset, cardBottom + cornerInset, arm, t, discRgb, 'bl');
  drawCornerBracket(page, cardRight - cornerInset, cardBottom + cornerInset, arm, t, discRgb, 'br');

  const topPad = 36;
  let y = cardTop - topPad;

  const logoBytes = await loadLogoPng();
  if (logoBytes) {
    const pngImage = await doc.embedPng(logoBytes);
    const maxW = 240;
    const scale = maxW / pngImage.width;
    const imgW = maxW;
    const imgH = pngImage.height * scale;
    const logoX = xMid - imgW / 2;
    const logoY = y - imgH;
    page.drawImage(pngImage, {
      x: logoX,
      y: logoY,
      width: imgW,
      height: imgH,
    });
    y = logoY - 20;
  } else {
    y -= 8;
  }

  const titleText = 'Certificate of Completion';
  const titleSize = 22;
  drawCenteredText(page, titleText, xMid, y, titleSize, timesRoman, rgb(0.95, 0.95, 0.97));
  y -= titleSize + 6;

  const ruleW = 96;
  page.drawLine({
    start: { x: xMid - ruleW / 2, y: y },
    end: { x: xMid + ruleW / 2, y: y },
    thickness: 1,
    color: discRgb,
  });
  y -= 28;

  const labelSmall = 9;
  const muted = rgb(0.65, 0.65, 0.68);
  drawCenteredText(page, 'THIS CERTIFIES THAT', xMid, y, labelSmall, helvetica, muted);
  y -= 16;

  const nameSize = 18;
  drawCenteredText(page, studentName, xMid, y, nameSize, timesItalic, rgb(126 / 255, 197 / 255, 1));
  y -= nameSize + 14;

  drawCenteredText(page, 'HAS SUCCESSFULLY COMPLETED', xMid, y, labelSmall, helvetica, muted);
  y -= 16;

  const courseLines = wrapCenteredLines(courseTitle, 78);
  const courseSize = 14;
  for (const line of courseLines) {
    drawCenteredText(page, line, xMid, y, courseSize, timesBold, rgb(0.9, 0.9, 0.93));
    y -= courseSize + 6;
  }
  y -= 10;

  // Discipline badge + label
  const badgePadX = 10;
  const badgePadY = 4;
  const badgeText = discipline.toUpperCase();
  const badgeFontSize = 9;
  const badgeW = helveticaBold.widthOfTextAtSize(badgeText, badgeFontSize) + badgePadX * 2;
  const badgeH = badgeFontSize + badgePadY * 2;
  const disciplineWord = 'Discipline';
  const discLabelW = helvetica.widthOfTextAtSize(disciplineWord, 9);
  const gap = 10;
  const rowW = badgeW + gap + discLabelW;
  let badgeLeft = xMid - rowW / 2;
  page.drawRectangle({
    x: badgeLeft,
    y: y - badgeH + 2,
    width: badgeW,
    height: badgeH,
    color: discRgb,
  });
  page.drawText(badgeText, {
    x: badgeLeft + badgePadX,
    y: y - badgeH + badgePadY + 1,
    size: badgeFontSize,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(disciplineWord, {
    x: badgeLeft + badgeW + gap,
    y: y - badgeH + badgePadY + 1,
    size: 9,
    font: helvetica,
    color: rgb(0.55, 0.55, 0.58),
  });
  y -= badgeH + 18;

  const dateStr = completedDate.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const stampText = 'IICRC CEC Approved';
  const stampSize = 8;
  const dateW = helvetica.widthOfTextAtSize(dateStr, 9);
  const stampW = helveticaBold.widthOfTextAtSize(stampText, stampSize) + 16;
  const stampH = stampSize + 8;
  const rowGap = 28;
  const dateStampW = dateW + rowGap + stampW;
  const rowLeft = xMid - dateStampW / 2;
  const rowCenterY = y - 10;
  const dateBaseline = rowCenterY - 2;
  page.drawText(dateStr, {
    x: rowLeft,
    y: dateBaseline,
    size: 9,
    font: helvetica,
    color: rgb(0.55, 0.55, 0.58),
  });
  const stampX = rowLeft + dateW + rowGap;
  const stampBoxBottom = rowCenterY - stampH / 2;
  page.drawRectangle({
    x: stampX,
    y: stampBoxBottom,
    width: stampW,
    height: stampH,
    color: cardFill,
    borderColor: discRgb,
    borderWidth: 1,
    borderOpacity: 0.38,
  });
  const stampTw = helveticaBold.widthOfTextAtSize(stampText, stampSize);
  page.drawText(stampText, {
    x: stampX + (stampW - stampTw) / 2,
    y: stampBoxBottom + 5,
    size: stampSize,
    font: helveticaBold,
    color: discRgb,
  });
  y = stampBoxBottom - 20;

  // Signature block (Training Director) — script approximated with Times-Italic
  const sigName = 'Philip McGurk';
  const sigSize = 20;
  drawCenteredText(page, sigName, xMid, y, sigSize, timesItalic, rgb(0.88, 0.88, 0.9));
  y -= sigSize + 6;

  const sigRuleW = 200;
  page.drawLine({
    start: { x: xMid - sigRuleW / 2, y: y },
    end: { x: xMid + sigRuleW / 2, y: y },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.78),
    opacity: 0.35,
  });
  y -= 14;
  drawCenteredText(page, 'TRAINING DIRECTOR', xMid, y, 8, helvetica, rgb(0.55, 0.55, 0.58));

  return doc.save();
}
