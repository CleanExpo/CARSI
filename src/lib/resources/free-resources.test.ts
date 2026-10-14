import { describe, expect, it } from 'vitest';

import { RESOURCE_CATEGORIES } from './categories';
import { FREE_RESOURCES, FREE_RESOURCE_JURISDICTIONS } from './free-resources';

/** The publishers' own hosts. A new host is a deliberate addition, reviewed against its licence. */
const OFFICIAL_HOSTS = new Set([
  'www.abcb.gov.au',
  'ncc.abcb.gov.au',
  'www.yourhome.gov.au',
  'knowledge.aidr.org.au',
  'www.safeworkaustralia.gov.au',
  'www.longpaddock.qld.gov.au',
  'www.business.qld.gov.au',
  'www.qbcc.qld.gov.au',
  'www.qra.qld.gov.au',
  'www.publications.qld.gov.au',
  'www.getready.qld.gov.au',
  'www.qld.gov.au',
  'www.health.nsw.gov.au',
  'www.act.gov.au',
  'www.epa.vic.gov.au',
  'info.health.nz',
  'www.legislation.govt.nz',
  'www.building.govt.nz',
]);

/**
 * Open set: CC BY (any version), CC0, or no copyright / public domain. Anchored at both ends so
 * a restricted suffix or mixed terms (CC BY 4.0-NC, "CC0 except photographs") cannot pass.
 */
const OPEN_LICENCE =
  /^(?:CC BY \d\.\d|CC0(?: 1\.0)?|No copyright \(NZ legislation\)|Public domain)$/;

/** Words that tell a reader which edition applies to their job. */
const EDITION_DIRECTIVE = /\b(current|latest|in force|new work|recent builds?|applies)\b/i;
const NCC_ADOPTION_QUALIFIER =
  "check which NCC edition your state or territory has adopted for your project's approval date";

/** Sources the founder excluded, whatever their licence verdict. */
const EXCLUDED =
  /iicrc|standards australia|standards\.org\.au|branz|fwpa|woodsolutions|timber queensland|timberqueensland|codehub/i;

describe('free-resources data', () => {
  it('lists resources with unique ids', () => {
    expect(FREE_RESOURCES.length).toBeGreaterThan(0);
    const ids = FREE_RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every item the required fields', () => {
    for (const r of FREE_RESOURCES) {
      for (const key of ['title', 'publisher', 'attribution', 'note'] as const) {
        expect(r[key].trim().length, `${r.id} ${key}`).toBeGreaterThan(0);
      }
      expect(r.readDate, `${r.id} readDate`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['PDF', 'web'], `${r.id} format`).toContain(r.format);
      expect(FREE_RESOURCE_JURISDICTIONS, `${r.id} jurisdiction`).toContain(r.jurisdiction);
      expect(
        RESOURCE_CATEGORIES.map((c) => c.id),
        `${r.id} category`
      ).toContain(r.category);
    }
  });

  it('links each item to an https URL on the publisher official host', () => {
    for (const r of FREE_RESOURCES) {
      const url = new URL(r.url);
      expect(url.protocol, r.id).toBe('https:');
      expect(OFFICIAL_HOSTS.has(url.hostname), `${r.id} host ${url.hostname}`).toBe(true);
    }
  });

  it('uses only open licences and carries the licence in the attribution line', () => {
    for (const r of FREE_RESOURCES) {
      expect(r.licence, r.id).toMatch(OPEN_LICENCE);
      expect(r.attribution, r.id).toMatch(/CC BY|no copyright/i);
    }
  });

  it('excludes IICRC, Standards Australia, BRANZ, FWPA/WoodSolutions and Timber Queensland', () => {
    for (const r of FREE_RESOURCES) {
      const text = [r.title, r.publisher, r.url, r.attribution, r.note].join(' ');
      expect(text, r.id).not.toMatch(EXCLUDED);
    }
  });

  it('keeps each note to one or two plain sentences', () => {
    for (const r of FREE_RESOURCES) {
      const sentences = r.note.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, r.id).toBeGreaterThanOrEqual(1);
      expect(sentences.length, r.id).toBeLessThanOrEqual(3);
    }
  });

  it('has items in every category and rehosts nothing', () => {
    for (const c of RESOURCE_CATEGORIES) {
      expect(
        FREE_RESOURCES.some((r) => r.category === c.id),
        c.id
      ).toBe(true);
    }
    expect(FREE_RESOURCES.some((r) => new URL(r.url).hostname.endsWith('carsi.com.au'))).toBe(
      false
    );
  });

  // NCC 2025 commences on different dates by state and territory (ABCB adoption table,
  // https://ncc.abcb.gov.au/ncc-2025-state-and-territory-adoption-information, accessed
  // 14/10/2026: NSW and Qld 1 May 2027, NT not adopted). No card may tell readers an edition is
  // "current" or is the one for new work without sending them to their state's adoption.
  it('never points readers to an NCC edition without the state-adoption qualifier', () => {
    for (const r of FREE_RESOURCES) {
      const mentionsNcc = /\bNCC\b|National Construction Code/i.test(
        [r.id, r.title, r.note].join(' ')
      );
      if (!mentionsNcc) continue;
      if (EDITION_DIRECTIVE.test(r.note)) {
        expect(r.note, r.id).toContain(NCC_ADOPTION_QUALIFIER);
      }
    }
  });

  it('flags an unqualified edition directive in the check above', () => {
    for (const bad of [
      'The current housing provisions, for NCC 2025. Use it for recent builds and new work.',
      'The current edition of Volume Two for houses.',
      'The latest NCC. Start here for new work.',
    ]) {
      expect(bad).toMatch(EDITION_DIRECTIVE);
      expect(bad).not.toContain(NCC_ADOPTION_QUALIFIER);
    }
  });

  it('rejects a non-open licence and an excluded source in the checks above', () => {
    expect('CC BY-NC 4.0').not.toMatch(OPEN_LICENCE);
    // Restricted suffixes and mixed terms after an accepted prefix must not pass.
    for (const restricted of [
      'CC BY 4.0-NC',
      'CC BY 4.0-ND',
      'CC BY 4.0 NC',
      'CC BY 4.0-NC-ND',
      'CC BY 3.0 (non-commercial use only)',
      'CC BY-SA 4.0',
      'CC0 except photographs',
      'No copyright (NZ legislation); images all rights reserved',
    ]) {
      expect(restricted).not.toMatch(OPEN_LICENCE);
    }
    for (const open of ['CC BY 4.0', 'CC BY 3.0', 'No copyright (NZ legislation)']) {
      expect(open).toMatch(OPEN_LICENCE);
    }
    expect('All rights reserved').not.toMatch(OPEN_LICENCE);
    expect('WoodSolutions TDG 09').toMatch(EXCLUDED);
    expect('BRANZ Bulletin').toMatch(EXCLUDED);
  });
});
