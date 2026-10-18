/**
 * Text of a PDF, for the licence inventory: every public PDF is scanned for the same claims as
 * page copy (review of fix/industry-faq-licence-v2, 19/10/2026). Built on pdf-lib, already a
 * dependency, so no new package: content streams are decoded, each font's ToUnicode CMap maps
 * glyph codes back to text, and text-showing operators (Tj, TJ, ', ") are read in order. Text
 * A baseline move starts a new line; the inventory's sentence logic joins wrapped lines.
 */
import { readFileSync } from 'node:fs';

import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFString,
} from 'pdf-lib';

const latin1 = (bytes) => Buffer.from(bytes).toString('latin1');

function streamText(doc, obj) {
  const stream = obj instanceof PDFRef ? doc.context.lookup(obj) : obj;
  if (!(stream instanceof PDFRawStream)) return '';
  return latin1(decodePDFRawStream(stream).decode());
}

function hexToUnicode(hex) {
  let out = '';
  for (let i = 0; i + 4 <= hex.length; i += 4)
    out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return out;
}

/** ToUnicode CMap: glyph code (hex) → text, plus the code width in hex digits. */
function parseCMap(src) {
  const map = new Map();
  let width = 4;
  for (const block of src.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) {
      map.set(m[1].toUpperCase(), hexToUnicode(m[2]));
      width = m[1].length;
    }
  }
  for (const block of src.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]*>|\[[^\]]*\])/g
    )) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      width = m[1].length;
      if (m[3].startsWith('[')) {
        const dests = [...m[3].matchAll(/<([0-9A-Fa-f]*)>/g)].map((d) => hexToUnicode(d[1]));
        for (let c = lo; c <= hi; c++)
          map.set(c.toString(16).toUpperCase().padStart(width, '0'), dests[c - lo] ?? '');
      } else {
        const base = m[3].slice(1, -1);
        const head = base.slice(0, -4);
        const tail = parseInt(base.slice(-4) || '0', 16);
        for (let c = lo; c <= hi; c++)
          map.set(
            c.toString(16).toUpperCase().padStart(width, '0'),
            hexToUnicode(head + (tail + c - lo).toString(16).padStart(4, '0'))
          );
      }
    }
  }
  return { map, width };
}

function fontMaps(doc, resources) {
  const fonts = new Map();
  const fontDict = resources?.lookup(PDFName.of('Font'));
  if (!(fontDict instanceof PDFDict)) return fonts;
  for (const [name, ref] of fontDict.entries()) {
    const font = doc.context.lookup(ref);
    if (!(font instanceof PDFDict)) continue;
    const toUnicode = font.get(PDFName.of('ToUnicode'));
    fonts.set(name.asString(), toUnicode ? parseCMap(streamText(doc, toUnicode)) : null);
  }
  return fonts;
}

function decodeShown(token, font) {
  if (token.startsWith('<')) {
    const hex = token.slice(1, -1).replace(/\s+/g, '').toUpperCase();
    // a simple font with no ToUnicode map: one byte per glyph, read as Latin-1 (WinAnsi for ASCII)
    if (!font) return latin1(Buffer.from(hex, 'hex'));
    let out = '';
    for (let i = 0; i < hex.length; i += font.width)
      out += font.map.get(hex.slice(i, i + font.width)) ?? '';
    return out;
  }
  // literal string (…) with simple escapes
  return token
    .slice(1, -1)
    .replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: '\n', r: '', t: ' ', b: '', f: '' })[c] ?? c)
    .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

/** Text of one content stream with its fonts; `Do` recurses into Form XObjects. */
function contentText(src, fonts, forms = () => '') {
  const tokens =
    src.match(/<[0-9A-Fa-f\s]*>|\((?:\\.|[^\\)])*\)|\[|\]|\/[^\s/<>[\]()]+|[^\s/<>[\]()]+/g) ?? [];
  let font = null;
  let out = '';
  let y = Number.NaN;
  let size = 12;
  let pending = [];
  let inArray = false;
  let arrayParts = [];
  for (const t of tokens) {
    if (t === '[') {
      inArray = true;
      arrayParts = [];
      continue;
    }
    if (t === ']') {
      inArray = false;
      pending = [arrayParts];
      continue;
    }
    if (inArray) {
      if (t.startsWith('<') || t.startsWith('(')) arrayParts.push(decodeShown(t, font));
      else if (/^-?\d+(?:\.\d+)?$/.test(t) && Number(t) < -200) arrayParts.push(' ');
      continue;
    }
    switch (t) {
      case 'Tf':
        font = fonts.get(pending[0]) ?? null;
        size = Math.abs(Number(pending[1] ?? size)) || size;
        break;
      case 'Tj':
      case "'":
      case '"':
        out += decodeShown(pending[pending.length - 1] ?? '', font);
        break;
      case 'TJ':
        out += (pending[0] ?? []).join('');
        break;
      case 'Td':
      case 'TD': {
        // Skia places every glyph with its own Td: only a baseline move starts a new line.
        const dx = Number(pending[0] ?? 0);
        const dy = Number(pending[1] ?? 0);
        if (Math.abs(dy) > 0.5 && !out.endsWith('\n')) out += '\n';
        // a sideways jump well beyond a glyph advance is a gap between words or table cells
        else if (dx > 2 * size && !/\s$/.test(out)) out += ' ';
        y += dy;
        break;
      }
      case 'Tm': {
        const ny = Number(pending[5] ?? y);
        if (Math.abs(ny - y) > 0.5 && !out.endsWith('\n')) out += '\n';
        else if (!/\s$/.test(out)) out += ' ';
        y = ny;
        break;
      }
      case 'T*':
        if (!out.endsWith('\n')) out += '\n';
        break;
      case 'Do': {
        const inner = forms(pending[0]);
        if (inner) out += (out.endsWith('\n') ? '' : '\n') + inner;
        break;
      }
      default:
        break;
    }
    if (/^[A-Za-z'"*]+$/.test(t) && !t.startsWith('/')) pending = [];
    else pending.push(t);
  }
  return out;
}

/** Text of a resource dictionary's Form XObject, by name (depth-limited). */
function formReader(doc, resources, depth) {
  return (name) => {
    if (depth > 4 || !name) return '';
    const xobjects = resources?.lookup(PDFName.of('XObject'));
    if (!(xobjects instanceof PDFDict)) return '';
    const ref = xobjects.get(PDFName.of(name.slice(1)));
    const form = ref instanceof PDFRef ? doc.context.lookup(ref) : ref;
    if (!(form instanceof PDFRawStream)) return '';
    if (form.dict.get(PDFName.of('Subtype'))?.asString() !== '/Form') return '';
    const own = form.dict.lookup(PDFName.of('Resources'));
    const res = own instanceof PDFDict ? own : resources;
    return contentText(streamText(doc, form), fontMaps(doc, res), formReader(doc, res, depth + 1));
  };
}

/**
 * Drops running headers and footers ("© CARSI · carsi.com.au Page 2 of 9"): a line that, digits
 * aside, appears on every page but at most one. A sentence that wraps over a page break then reads
 * as one sentence, so the inventory sees "CARSI is an IICRC CEC Accredited provider." whole.
 */
function withoutRunningLines(pages) {
  if (pages.length < 3) return pages;
  const key = (line) => line.trim().replace(/\d+/g, '#');
  const seen = new Map();
  for (const page of pages)
    for (const k of new Set(page.split('\n').map(key).filter(Boolean)))
      seen.set(k, (seen.get(k) ?? 0) + 1);
  return pages.map((page) =>
    page
      .split('\n')
      .filter((line) => (seen.get(key(line)) ?? 0) < pages.length - 1)
      .join('\n')
  );
}

export async function pdfText(path) {
  const doc = await PDFDocument.load(readFileSync(path), { updateMetadata: false });
  const pages = [];
  for (const page of doc.getPages()) {
    const resources = page.node.Resources();
    const fonts = fontMaps(doc, resources);
    const contents = page.node.get(PDFName.of('Contents'));
    const streams = contents instanceof PDFArray ? contents.asArray() : [contents];
    pages.push(
      streams
        .map((s) => contentText(streamText(doc, s), fonts, formReader(doc, resources, 0)))
        .join('\n')
    );
  }
  // NFKC folds ligatures (ﬁ → fi) so words match the source copy.
  return withoutRunningLines(pages).join('\n').normalize('NFKC');
}

// unused-import guard for tree-shaking linters
void PDFHexString;
void PDFString;
