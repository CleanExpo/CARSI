/**
 * Licence inventory gate (reviews of fix/industry-faq-licence, 18/10/2026). Scope is discovered:
 * every file under app/, src/ and public/, and every classified docs/ directory. Every hit is
 * classified on the SENTENCE that contains it; an unclassified copy hit is an exposure and fails
 * here. Exemptions are per line (scripts/licence-inventory-reviewed.json). Table:
 * docs/compliance/licence-inventory.md.
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  classifyCopy,
  docsScope,
  inventory,
  REVIEWED,
  sentenceAt,
} from '../../../scripts/licence-inventory.mjs';

type Hit = { file: string; line: number; term: string; cls: string; reason: string; text: string };

const INDUSTRY = 'app/(public)/industries/x/page.tsx';
const DOC = 'docs/marketing/x.md';
const CAMPAIGN = 'docs/campaigns/x.md';
const CODE = 'W' + 'RT'; // assembled so this file never spells the banned construction

describe('licence inventory', () => {
  const hits = inventory() as Hit[];

  it('inventory: covers every public surface (the pass is not vacuous)', () => {
    for (const s of [
      'app/',
      'src/',
      'public/',
      'docs/marketing/',
      'docs/campaigns/',
      'docs/course-updates/',
    ])
      expect(
        hits.some((h) => h.file.startsWith(s)),
        s
      ).toBe(true);
    expect(hits.length).toBeGreaterThan(3000);
  });

  it('inventory: no copy hit is an unclassified exposure', () => {
    const exposures = hits
      .filter((h) => h.cls === 'exposure')
      .map((h) => `${h.file}:${h.line} [${h.term}] ${h.reason}: ${h.text}`);
    expect(exposures).toEqual([]);
  });

  it('scope: every docs/ directory is classified (discovery, not a hand list)', () => {
    expect(docsScope().filter((d: { kind: string }) => d.kind === 'unclassified')).toEqual([]);
  });

  it('scope: a new, unclassified docs/ directory fails the gate (control)', () => {
    const root = mkdtempSync(join(tmpdir(), 'licence-scope-'));
    mkdirSync(join(root, 'docs', 'brand-new-campaigns'), { recursive: true });
    const unclassified = docsScope(root).filter((d: { kind: string }) => d.kind === 'unclassified');
    expect(unclassified.map((d: { dir: string }) => d.dir)).toEqual(['docs/brand-new-campaigns']);
    expect((inventory(root) as Hit[]).some((h) => h.cls === 'exposure')).toBe(true);
  });

  it('exemptions: every reviewed entry names a reason, a file and the exact line it covers', () => {
    for (const e of REVIEWED as Array<{
      file: string;
      line: number;
      contains: string;
      reason: string;
      class: string;
    }>) {
      expect(e.reason.length, `${e.file}:${e.line}`).toBeGreaterThan(20);
      expect(['legitimate', 'owned-elsewhere']).toContain(e.class);
      expect(existsSync(e.file), e.file).toBe(true);
      expect(readFileSync(e.file, 'utf8').split('\n')[e.line - 1], `${e.file}:${e.line}`).toContain(
        e.contains
      );
    }
  });

  it.each([
    // review of ea205ee5 — the reviewer's strings
    [
      'iicrc-offer',
      INDUSTRY,
      'IICRC water damage and mould management training for Australian construction sites.',
    ],
    [
      'CEC',
      'app/(public)/subscribe/success/page.tsx',
      'Start a lesson and earn IICRC CECs toward renewal as you complete training.',
    ],
    ['certif', DOC, 'Earn verifiable IICRC credentials your HSE team can audit.'],
    ['statistic', DOC, '| Headline 5 | Trusted by 500+ Australian Technicians |'],
    ['statistic', DOC, '| Headline 2 | Avoid $500K+ Mould Liability Costs |'],
    ['iicrc-code', 'src/components/tools/CECCalculator.tsx', `Browse CARSI ${CODE} online course`],
    [
      'CEC',
      'src/components/tools/CECCalculator.tsx',
      'Every CARSI module grants IICRC CECs on completion',
    ],
    ['repair', CAMPAIGN, 'CARSI offers carpet repair and reinstallation training.'],
    ['iicrc-code', CAMPAIGN, `- ${CODE} Water Damage Restoration Fundamentals`],
    [
      'statistic',
      CAMPAIGN,
      'Mould remediation in new builds (30%+ of new QLD homes have mould within 2 years)',
    ],
    // earlier rounds
    ['CEC', DOC, '> **Hook:** 40+ IICRC CEC courses. Zero classroom time.'],
    [
      'board-approved',
      DOC,
      "CARSI's courses are IICRC board-approved — the same credential standard.",
    ],
    ['certif', DOC, '| 7   | The 3 IICRC certs that unlock restoration revenue |'],
    ['CEC', INDUSTRY, "title: 'Childcare IICRC CEC Training',"],
    [
      'CEC',
      DOC,
      'CARSI offers IICRC CEC Accredited courses in mould assessment, remediation and indoor air quality.',
    ],
    [
      'certif',
      DOC,
      '"💧 The 3 water categories every restorer must know. Get certified → carsi.com.au"',
    ],
  ])('controls: %s fires in %s: %s', (term, file, text) => {
    expect(classifyCopy(file, term, text)[0]).toBe('exposure');
  });

  it('sentence scope: a legitimate phrase elsewhere on the line cannot excuse the claim', () => {
    const line =
      '| Description 2 | Earn verifiable IICRC credentials your HSE team can audit. Digital certificates with public verification URL. |';
    const at = line.indexOf('IICRC credentials');
    const sentence = sentenceAt(line, at, at + 'IICRC credentials'.length);
    expect(sentence).not.toContain('Digital certificates');
    expect(classifyCopy(DOC, 'certif', sentence)[0]).toBe('exposure');
  });

  it.each([
    [
      'CEC',
      INDUSTRY,
      'CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, its CEC hours are shown on the course page.',
    ],
    [
      'certif',
      INDUSTRY,
      'IICRC certification is obtained only through IICRC-approved schools and examinations.',
    ],
    ['iicrc-code', DOC, 'Oct-Nov'],
    ['certif', 'src/components/x.tsx', 'This is to certify that'],
    [
      'CEC',
      'app/layout.tsx',
      'IICRC CEC Accredited courses for cleaning and restoration professionals in Australia.',
    ],
    ['statistic', DOC, '| CTR | 5.0% | 5.5% |'],
  ])('negative controls: %s stays legitimate in %s: %s', (term, file, text) => {
    expect(classifyCopy(file, term, text)[0]).toBe('legitimate');
  });
});

/**
 * Review of ea205ee5 (P1-LIVE-CONSTRUCTION-METADATA): /industries/construction
 * metadata said "IICRC water damage and mould management training". Industry page metadata
 * (title, description, keywords, Open Graph) may name the IICRC only as CARSI's provider
 * standing, a conditional CEC rule, or a negation.
 */
describe('industry metadata never brands CARSI training with the IICRC name', () => {
  const dir = join(process.cwd(), 'app', '(public)', 'industries');
  const pages = readdirSync(dir)
    .filter((s) => existsSync(join(dir, s, 'page.tsx')))
    .map((s) => [s, readFileSync(join(dir, s, 'page.tsx'), 'utf8')] as const);

  function metadataBlock(src: string): string {
    const start = src.search(/export const metadata\b/);
    if (start < 0) return '';
    const ends = ['\n};', '\n});', '\n);'].map((t) => src.indexOf(t, start)).filter((i) => i > 0);
    return src.slice(start, ends.length ? Math.min(...ends) : undefined);
  }
  const ALLOWED =
    /IICRC CEC Accredited provider|the IICRC has approved|not IICRC certification|no CARSI course is IICRC certification|IICRC certification itself/g;
  const iicrcMentions = (block: string) =>
    block.replace(ALLOWED, '').match(/[^'"`]*\bIICRC\b[^'"`]*/g) ?? [];

  it('metadata: the check fires on the live construction description (control)', () => {
    expect(
      iicrcMentions(
        "export const metadata = {\n  description:\n    'IICRC water damage and mould management training for Australian construction sites.',\n};"
      )
    ).not.toEqual([]);
  });

  it.each(pages)('metadata: %s', (_slug, src) => {
    expect(iicrcMentions(metadataBlock(src))).toEqual([]);
  });
});
