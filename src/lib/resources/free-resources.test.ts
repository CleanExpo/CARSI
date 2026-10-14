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

/** Open set: CC BY (any version), CC0, or no copyright / public domain. */
const OPEN_LICENCE = /^(CC BY \d\.\d|CC0|No copyright|Public domain)/;

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

  it('rejects a non-open licence and an excluded source in the checks above', () => {
    expect('CC BY-NC 4.0').not.toMatch(OPEN_LICENCE);
    expect('All rights reserved').not.toMatch(OPEN_LICENCE);
    expect('WoodSolutions TDG 09').toMatch(EXCLUDED);
    expect('BRANZ Bulletin').toMatch(EXCLUDED);
  });
});
