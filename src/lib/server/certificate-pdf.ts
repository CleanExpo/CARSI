import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function loadLogoPng(): Promise<Uint8Array | null> {
  try {
    const p = path.join(process.cwd(), 'public', 'logo', 'logo1.png');
    return await readFile(p);
  } catch {
    return null;
  }
}

export async function buildCompletionCertificatePdf(params: {
  studentName: string;
  courseTitle: string;
  completedDate: Date;
}): Promise<Uint8Array> {
  const { studentName, courseTitle, completedDate } = params;

  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const { width, height } = page.getSize();

  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);

  const margin = 56;
  const innerX = margin * 0.35;
  const innerY = margin * 0.35;
  const innerW = width - margin * 0.7;
  const innerH = height - margin * 0.7;
  page.drawRectangle({
    x: innerX,
    y: innerY,
    width: innerW,
    height: innerH,
    color: rgb(0.06, 0.09, 0.14),
    borderColor: rgb(0.2, 0.5, 0.82),
    borderWidth: 2,
  });

  const logoBytes = await loadLogoPng();
  let titleBaseline = height - margin - 36;

  if (logoBytes) {
    const pngImage = await doc.embedPng(logoBytes);
    const maxW = 200;
    const scale = maxW / pngImage.width;
    const imgW = maxW;
    const imgH = pngImage.height * scale;
    const logoBottomY = height - margin - 16 - imgH;
    const x0 = (width - imgW) / 2;
    page.drawImage(pngImage, {
      x: x0,
      y: logoBottomY,
      width: imgW,
      height: imgH,
    });
    titleBaseline = logoBottomY - 28;
  }

  const titleText = 'Certificate of Completion';
  const titleSize = 28;
  const titleW = titleFont.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: logoBytes ? (width - titleW) / 2 : margin,
    y: titleBaseline,
    size: titleSize,
    font: titleFont,
    color: rgb(0.94, 0.95, 0.97),
  });

  page.drawText('This certifies that', {
    x: margin,
    y: titleBaseline - 60,
    size: 12,
    font: bodyFont,
    color: rgb(0.62, 0.66, 0.74),
  });

  page.drawText(studentName, {
    x: margin,
    y: titleBaseline - 92,
    size: 22,
    font: titleFont,
    color: rgb(0.55, 0.78, 0.98),
  });

  page.drawText('has successfully completed', {
    x: margin,
    y: titleBaseline - 132,
    size: 12,
    font: bodyFont,
    color: rgb(0.62, 0.66, 0.74),
  });

  const wrappedTitle = wrapLine(courseTitle, 70);
  let ty = titleBaseline - 162;
  for (const line of wrappedTitle) {
    page.drawText(line, {
      x: margin,
      y: ty,
      size: 16,
      font: titleFont,
      color: rgb(0.9, 0.91, 0.93),
    });
    ty -= 22;
  }

  const dateStr = completedDate.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  page.drawText(`Completed on ${dateStr}`, {
    x: margin,
    y: margin + 48,
    size: 11,
    font: bodyFont,
    color: rgb(0.52, 0.56, 0.64),
  });

  return doc.save();
}

function wrapLine(text: string, maxChars: number): string[] {
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
