#!/usr/bin/env node
/**
 * CARSI SWMS template library guard.
 *
 * The templates under public/downloads/swms/ are published for other firms to adopt. They were
 * de-branded from documents supplied by a working restoration company, so the release-blocking
 * question is whether any trace of that company, its people or its clients survived: a logo, a
 * name, an ABN, a phone number, a signature, an address.
 *
 * This guard re-reads every published PDF, inflates its content streams and asserts that no
 * identifying string, contact detail or company domain survives, and that the library manifest
 * and the files on disk describe the same set. It also holds these documents to the fail-closed
 * IICRC/CEC rule: a SWMS is a work health and safety document and carries no IICRC framing and
 * no CEC hours.
 *
 * It reads text, not pictures: a logo re-introduced as an image would pass. The removed logos
 * were verified by rendering every page at the time of de-branding.
 *
 * Fail-closed: any hit is a release blocker.
 *   Run:  node scripts/check-swms-templates.mjs
 *   Test: node scripts/check-swms-templates.test.mjs   (proves the guard can fail)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

const PDF_DIR = process.argv[2] ?? 'public/downloads/swms';
const MANIFEST = 'src/lib/marketing/swms-templates.ts';

/**
 * Identifying strings from the source documents. Anything matching these must never reach a
 * published template. Kept as literal fragments rather than one broad name regex so the failure
 * message names what was found.
 */
const IDENTIFIERS = [
  'Disaster Recovery',
  'Lederhose',
  'Diesing',
  'Wacol',
  '42 633 062 307',
  '3879 4677',
  '0457 123 115',
  '1300 309 361',
  'Insurance claims made easier',
];

/**
 * Shapes that would betray a company even under a name we have not seen: an ABN, an Australian
 * landline or mobile. The templates are blank forms, so a hit here is a leak, not a false
 * positive.
 */
const SHAPES = [
  [/\bABN[:\s]*\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/, 'an ABN value'],
  [/\b(?:0[2378]|13\s?00|1800)\s?\d{4}\s?\d{4}\b/, 'a phone number'],
  [/\b04\d{2}\s?\d{3}\s?\d{3}\b/, 'a mobile number'],
];

/**
 * Hosts a template legitimately contains, so a contact detail can still be caught without the
 * rule drowning in them. Everything outside this list is reported.
 */
const BENIGN_HOSTS = [
  // Legislation, regulators and codes of practice, cited on the reference page of every SWMS
  // for all nine Australian jurisdictions and New Zealand.
  '.gov.au',
  '.govt.nz',
  '.gov.nz',
  // Font and certificate metadata carried inside the embedded typefaces and the code-signing
  // chain. Present in anything this toolchain produces; says nothing about any firm.
  'microsoft.com',
  'monotype.com',
  'verisign.com',
  'fonts.com',
  'lucasfonts.com',
  'wikipedia.org',
  'adobe.com',
  'w3.org',
  // Source of the first-aid pictogram in the template artwork.
  'stickerart.com.au',
];

const DOMAIN =
  '[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*';
const EMAIL_RE = new RegExp(`[A-Za-z0-9._%+-]+@${DOMAIN}\\.[A-Za-z]{2,}`, 'g');
const URL_RE = new RegExp(`(?:https?://|www\\.)${DOMAIN}\\.[A-Za-z]{2,}`, 'g');

function hostOf(value) {
  return value
    .replace(/^[A-Za-z0-9._%+-]+@/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    .toLowerCase();
}

const isBenign = (value) => {
  const host = hostOf(value);
  return BENIGN_HOSTS.some((h) => {
    if (h.startsWith('.')) return host.endsWith(h);
    if (host === h || host.endsWith(`.${h}`)) return true;
    // Font and certificate tables store strings back-to-back with no delimiter, so a benign
    // host arrives fused to the next entry ("fonts.comYou", "lucasfonts.comMicrosoft"). Accept
    // that only when a letter follows the host: a "." or "-" there would mean a real, and
    // different, domain ("microsoft.com.example.com" stays a failure).
    return host.startsWith(h) && /[a-z]/.test(host.charAt(h.length));
  });
};

/** These are WHS documents: IICRC/CEC framing is opt-in per course and never applies here. */
const IICRC_CEC = [
  [/\bIICRC\b/i, 'an IICRC reference'],
  [/\bCEC\b/, 'a CEC reference'],
  [/\bcontinuing education credit/i, 'a CEC reference'],
];

const errors = [];
const err = (m) => errors.push(m);

/**
 * Pull readable text out of a PDF without a PDF library: concatenate every content stream we can
 * inflate, plus the raw bytes for anything stored uncompressed. Text in these documents is drawn
 * with literal `(...)Tj` / `[(...)]TJ` operators, so a substring search over the inflated streams
 * sees what a reader would see.
 */
function extractText(buf) {
  const parts = [buf.toString('latin1')];
  const raw = parts[0];
  let at = 0;
  for (;;) {
    const start = raw.indexOf('stream', at);
    if (start === -1) break;
    const end = raw.indexOf('endstream', start);
    if (end === -1) break;
    let from = start + 'stream'.length;
    if (raw[from] === '\r') from += 1;
    if (raw[from] === '\n') from += 1;
    try {
      parts.push(inflateSync(buf.subarray(from, end)).toString('latin1'));
    } catch {
      // Not a deflate stream (an embedded JPEG, say) — the raw pass above already covers it.
    }
    at = end + 'endstream'.length;
  }
  return parts.join('\n');
}

let files = [];
try {
  files = readdirSync(PDF_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort();
} catch (e) {
  err(`cannot read ${PDF_DIR}: ${e.message}`);
}

if (files.length === 0) err(`${PDF_DIR} contains no PDFs — the library must not ship empty`);

for (const file of files) {
  const path = join(PDF_DIR, file);
  const buf = readFileSync(path);
  const text = extractText(buf);

  for (const needle of IDENTIFIERS) {
    if (text.includes(needle)) err(`${file}: contains the identifying string "${needle}"`);
  }
  for (const [shape, label] of SHAPES) {
    const hit = text.match(shape);
    if (hit) err(`${file}: contains ${label} ("${hit[0].trim()}") — templates ship blank`);
  }
  for (const [re, label] of [
    [EMAIL_RE, 'an email address'],
    [URL_RE, 'a website'],
  ]) {
    for (const [hit] of text.matchAll(re)) {
      if (!isBenign(hit)) {
        err(`${file}: contains ${label} ("${hit}") — templates ship blank`);
        break;
      }
    }
  }
  for (const [shape, label] of IICRC_CEC) {
    if (shape.test(text)) err(`${file}: contains ${label} — SWMS carry no IICRC or CEC framing`);
  }
  if (statSync(path).size === 0) err(`${file}: is empty`);
}

// The manifest and the directory must describe the same library, or the page offers a
// download that 404s (or a file ships that no page reviewed).
let manifest = '';
try {
  manifest = readFileSync(MANIFEST, 'utf8');
} catch (e) {
  err(`cannot read ${MANIFEST}: ${e.message}`);
}

if (manifest) {
  const declared = [...manifest.matchAll(/file:\s*'([^']+\.pdf)'/g)].map((m) => m[1]).sort();
  for (const file of declared) {
    if (!files.includes(file)) err(`${MANIFEST} declares "${file}", which is not in ${PDF_DIR}`);
  }
  for (const file of files) {
    if (!declared.includes(file)) err(`${PDF_DIR}/${file} is not declared in ${MANIFEST}`);
  }
}

if (errors.length > 0) {
  console.error(`SWMS template guard FAILED (${errors.length} problem(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `SWMS template guard passed — ${files.length} template(s) in ${PDF_DIR} carry no identifying data.`
);
