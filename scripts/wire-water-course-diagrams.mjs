#!/usr/bin/env node
/**
 * wire-water-course-diagrams.mjs: puts the GP-752 diagrams into the water-damage-restoration-
 * fundamentals lessons. Run it once, after the GP-748 catalogue PR has merged.
 *
 * Each new diagram is added to the "See it" part of one teaching lesson, straight after that
 * lesson's existing diagram and caption (before its "Do it in metric" heading), in both the live
 * seed catalogue and the v1-draft copy. The edit is made on the raw file text, so nothing else in
 * the catalogue moves (JSON.parse plus JSON.stringify does not round-trip these files byte for
 * byte). After editing, the file is parsed again and compared with the original: only the mapped
 * lessons' contentBody may differ.
 *
 * Usage:
 *   node scripts/wire-water-course-diagrams.mjs           dry run: report what would change
 *   node scripts/wire-water-course-diagrams.mjs --write   apply the change
 *   --root=DIR  read and write under DIR (default: current directory)
 * Running it again after --write changes nothing. Exit 1 when a lesson, its existing diagram or
 * a new diagram file cannot be found.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isEntryPoint } from './lib/is-entry-point.mjs';

export const SLUG = 'water-damage-restoration-fundamentals';
export const CATALOGUES = [
  'data/seed/courses-catalog.json',
  `data/courses/${SLUG}/v1-draft/courses-catalog.json`,
];
const DIR = `/courses/${SLUG}/diagrams/`;

/** lessonId -> the lesson's existing diagram (the anchor) and the new diagrams to add after it. */
export const MAPPING = [
  {
    lessonId: 'e95fd84c-cf63-40b7-816d-cf642c35e307',
    lessonTitle: 'Instruments and what they tell you',
    anchor: 'moisture-instruments.svg',
    add: [
      {
        file: 'moisture-meter-pin-probe-exploded.svg',
        alt: 'Pull-apart view of a generic pin moisture meter: pins, probe head, lead, meter body and battery, with a cross-section of two pins in timber.',
        caption:
          'The pull-apart view shows the parts of a pin meter and how it reads the resistance between its pins.',
      },
    ],
  },
  {
    lessonId: 'b5aff281-5122-439b-9e7d-6ba20f9a4be3',
    lessonTitle: 'Mapping moisture and setting a dry goal',
    anchor: 'moisture-map.svg',
    add: [
      {
        file: 'drying-curve-to-dry-standard.svg',
        alt: 'Drying curve for one numbered point on wet skirting: 28 % on day 1, falling over later visits to the 12 % dry standard and staying there on the next visit.',
        caption:
          'The drying curve tracks one numbered point from 28 % back to the 12 % dry standard, then one more visit to confirm it is stable.',
      },
    ],
  },
  {
    lessonId: '9df19425-5d0f-42c7-b3ef-b8c134a84571',
    lessonTitle: 'The drying equation: heat, airflow and humidity',
    anchor: 'drying-levers.svg',
    add: [
      {
        file: 'air-moisture-graph.svg',
        alt: 'Chart of water in the air in g/kg against temperature in °C, with the saturation line and the lesson examples: room air at about 16 g/kg, conditioned by the dehumidifier to about 8.4 g/kg.',
        caption:
          'The chart plots the lesson figures: the same temperature can carry very different g/kg, and the dehumidifier moves the air down the chart.',
      },
    ],
  },
  {
    lessonId: '2511b0e2-c687-452a-85a0-206659c47150',
    lessonTitle: 'Equipment, power budgeting and the mould rule',
    anchor: 'power-budget.svg',
    add: [
      {
        file: 'refrigerant-dehumidifier-exploded.svg',
        alt: 'Pull-apart view of a generic refrigerant dehumidifier along its air path: inlet and filter, cold coil, warm coil, fan and outlet, with the condensate tray, compressor and 230 V lead.',
        caption:
          'The pull-apart view follows the air through a refrigerant dehumidifier, from wet air in to drier air out.',
      },
      {
        file: 'air-mover-exploded.svg',
        alt: 'Pull-apart view of a generic centrifugal air mover: inlet grille, fan wheel, 230 V motor, housing and outlet.',
        caption:
          'The pull-apart view shows the parts of an air mover; it speeds evaporation and must be paired with dehumidification.',
      },
    ],
  },
];

const MARKER = '<h3>Do it in metric</h3>';

function htmlFor(a) {
  for (const s of [a.alt, a.caption]) {
    if (/['<>&"]/.test(s)) throw new Error(`alt/caption must not contain ' " < > &: ${s}`);
  }
  return `<p><img src='${DIR}${a.file}' alt='${a.alt}'></p><p>${a.caption}</p>`;
}
/** The text as it appears inside a JSON string in the file. */
function jsonInner(s) {
  return JSON.stringify(s).slice(1, -1);
}
function findLesson(catalog, id) {
  const course = (catalog.courses || []).find((c) => c.slug === SLUG);
  if (!course) return null;
  for (const m of course.modules || []) for (const l of m.lessons || []) if (l.id === id) return l;
  return null;
}

/**
 * Plan and apply the edit to one catalogue's raw text. Returns { text, changes, errors }.
 * Pure: does not touch the disk.
 */
export function wireText(raw, root) {
  const errors = [];
  const changes = [];
  let text = raw;
  const before = JSON.parse(raw);
  for (const m of MAPPING) {
    const lesson = findLesson(before, m.lessonId);
    if (!lesson) {
      errors.push(`lesson ${m.lessonId} (${m.lessonTitle}) not found`);
      continue;
    }
    if (lesson.contentType === 'quiz') errors.push(`lesson ${m.lessonId} is a quiz`);
    const anchorSrc = jsonInner(`${DIR}${m.anchor}`);
    for (const a of m.add) {
      if (!existsSync(join(root, 'public', DIR, a.file))) {
        errors.push(`diagram file missing: public${DIR}${a.file}`);
        continue;
      }
      if (String(lesson.contentBody || '').includes(`${DIR}${a.file}`)) continue; // already wired
      const at = text.indexOf(anchorSrc);
      if (at < 0 || text.indexOf(anchorSrc, at + 1) >= 0) {
        errors.push(`existing diagram ${m.anchor} not found exactly once`);
        continue;
      }
      const ins = text.indexOf(jsonInner(MARKER), at);
      // The marker must sit in the same JSON string: no closing quote between anchor and marker.
      const between = ins < 0 ? '' : text.slice(at, ins);
      if (ins < 0 || /(^|[^\\])"/.test(between)) {
        errors.push(`"Do it in metric" heading not found after ${m.anchor} in the same lesson`);
        continue;
      }
      text = text.slice(0, ins) + jsonInner(htmlFor(a)) + text.slice(ins);
      changes.push(`${m.lessonTitle}: + ${a.file}`);
    }
  }
  // Verify: only the mapped lessons' contentBody changed, and each now holds its diagrams.
  if (!errors.length && text !== raw) {
    const after = JSON.parse(text);
    const strip = (cat) => {
      const c = structuredClone(cat);
      for (const m of MAPPING) {
        const l = findLesson(c, m.lessonId);
        if (l) l.contentBody = '';
      }
      return JSON.stringify(c);
    };
    if (strip(after) !== strip(before))
      errors.push('edit changed something other than the mapped lessons');
    for (const m of MAPPING) {
      const body = findLesson(after, m.lessonId)?.contentBody || '';
      for (const a of m.add)
        if (!body.includes(`${DIR}${a.file}`)) errors.push(`${a.file} not present after edit`);
    }
  }
  return { text, changes, errors };
}

if (isEntryPoint(import.meta.url)) {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const root = args.find((a) => a.startsWith('--root='))?.slice(7) || '.';
  let failed = false;
  for (const rel of CATALOGUES) {
    const path = join(root, rel);
    if (!existsSync(path)) {
      console.error(`${rel}: missing`);
      failed = true;
      continue;
    }
    const raw = readFileSync(path, 'utf8');
    const { text, changes, errors } = wireText(raw, root);
    for (const e of errors) console.error(`${rel}: ${e}`);
    if (errors.length) {
      failed = true;
      continue;
    }
    if (!changes.length) {
      console.log(`${rel}: already wired, nothing to do`);
      continue;
    }
    for (const c of changes) console.log(`${rel}: ${c}`);
    if (write) writeFileSync(path, text);
  }
  if (failed) process.exit(1);
  console.log(write ? 'Written.' : 'Dry run only; pass --write to apply.');
}
