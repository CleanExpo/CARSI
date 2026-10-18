/**
 * Licence inventory gate (review of fix/industry-faq-licence round 2, 18/10/2026). One exhaustive
 * pass over app/, src/, public/, docs/marketing and docs/content for every IICRC code, "certif",
 * "CEC", "accredit", "board-approved" and the unsold subjects. Every hit must be classified;
 * an unclassified copy hit is an exposure and fails here. Table: docs/compliance/licence-inventory.md.
 */
import { describe, expect, it } from 'vitest';

import { classifyCopy, inventory } from '../../../scripts/licence-inventory.mjs';

type Hit = { file: string; line: number; term: string; cls: string; reason: string; text: string };

const INDUSTRY = 'app/(public)/industries/x/page.tsx';
const DOC = 'docs/marketing/x.md';

describe('licence inventory', () => {
  it('inventory: covers every public surface (the pass is not vacuous)', () => {
    const hits = inventory() as Hit[];
    const surfaces = new Set(hits.map((h) => h.file.split('/').slice(0, 2).join('/')));
    for (const s of [
      'app/(public)',
      'src/components',
      'src/lib',
      'public/llms.txt',
      'docs/marketing',
      'docs/content',
    ])
      expect(
        [...surfaces].some((x) => x.startsWith(s.split('/').slice(0, 2).join('/'))),
        s
      ).toBe(true);
    expect(hits.length).toBeGreaterThan(3000);
  });

  it('inventory: no copy hit is an unclassified exposure', () => {
    const exposures = (inventory() as Hit[])
      .filter((h) => h.cls === 'exposure')
      .map((h) => `${h.file}:${h.line} [${h.term}] ${h.reason}: ${h.text}`);
    expect(exposures).toEqual([]);
  });

  it.each([
    // the reviewer's live strings (ea205ee5)
    [
      'CEC',
      DOC,
      '> **Hook:** 40+ IICRC CEC courses. Zero classroom time. One annual subscription.',
    ],
    [
      'CEC',
      DOC,
      '| Description 1 | Access our IICRC CEC Accredited catalogue — 80 courses with a CARSI subscription. |',
    ],
    [
      'board-approved',
      DOC,
      '"CARSI\'s courses are IICRC board-approved — the same credential standard as any classroom course."',
    ],
    ['certif', DOC, '| 7   | The 3 IICRC certs that unlock restoration revenue |'],
    [
      'certif',
      INDUSTRY,
      "'Train SES volunteers. CARSI water damage restoration and mould remediation certification for flood and fire response.'",
    ],
    [
      'certif',
      INDUSTRY,
      "'Odour control and carpet cleaning certifications provide standards-based approaches.'",
    ],
    ['colour', 'src/lib/server/x.ts', '`We prioritised colour repair courses.`'],
    [
      'iicrc-code',
      'src/components/x.tsx',
      `{ value: 'CRT', label: 'CRT — Carpet' } Browse ${'W' + 'RT'} courses`,
    ],
    // the industry forms fixed in this pass
    ['CEC', INDUSTRY, "title: 'Childcare IICRC CEC Training',"],
    [
      'CEC',
      INDUSTRY,
      "'Cabins develop mould. CEC-accredited mould remediation training gives staff the protocols.'",
    ],
    ['CEC', INDUSTRY, "{ value: 'IICRC', label: 'CEC Accredited' },"],
    [
      'CEC',
      DOC,
      'CARSI offers IICRC CEC Accredited courses in mould assessment, remediation and indoor air quality.',
    ],
    [
      'CEC',
      'src/components/x.tsx',
      'Hemisphere Restoration Designations — and also earn IICRC CECs toward their skills.',
    ],
    [
      'certif',
      DOC,
      '"💧 The 3 water categories every restorer must know. Get certified → carsi.com.au"',
    ],
    ['certif', DOC, 'Earn verifiable IICRC credentials. Protect your workforce.'],
  ])('controls: %s fires on "%s" copy: %s', (term, file, text) => {
    expect(classifyCopy(file, term, text)[0]).toBe('exposure');
  });

  it.each([
    [
      'CEC',
      INDUSTRY,
      "'CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, its CEC hours are shown on the course page.'",
    ],
    [
      'certif',
      INDUSTRY,
      "'IICRC certification is obtained only through IICRC-approved schools and examinations.'",
    ],
    ['iicrc-code', DOC, '| **Oct-Nov**    | Pre-wet season |'],
    ['certif', 'src/components/x.tsx', 'This is to certify that'],
    [
      'CEC',
      'app/layout.tsx',
      "'IICRC CEC Accredited courses for cleaning and restoration professionals in Australia.'",
    ],
  ])('negative controls: %s stays legitimate in "%s": %s', (term, file, text) => {
    expect(classifyCopy(file, term, text)[0]).toBe('legitimate');
  });
});
