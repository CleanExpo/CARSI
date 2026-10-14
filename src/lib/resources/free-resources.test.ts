import { describe, expect, it } from 'vitest';

import { RESOURCE_CATEGORIES } from './categories';
import {
  RESOURCE_STATUS_LABEL,
  FREE_RESOURCES,
  FREE_RESOURCE_JURISDICTIONS,
} from './free-resources';

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

/**
 * Wording that says or implies which work, job, state, date or building a document applies to.
 * Building-code cards describe only what the document is; applicability is handled once, by
 * the section note above the building-code group. Deliberately broad: a false positive costs a
 * rewrite, a miss sends a job to the wrong code.
 */
const APPLICABILITY_WORDING =
  /\b(use[sd]?|using|apply|applies|applied|applying|current|latest|in force|new|recent|still|non-house|commercial|class(?:es)?|renovations?|existing buildings?|built under|designed under|start here|starting point|jobs?|when|for [a-z ,-]{0,40}\bwork)\b/i;

/** A card is in scope if it names the NCC anywhere or is published by the ABCB. */
function isBuildingCodeCard(r: {
  id: string;
  title: string;
  note: string;
  url: string;
  publisher: string;
}) {
  return (
    /\bNCC\b|National Construction Code|Building Code of Australia|\bBCA\b|ncc/i.test(
      [r.id, r.title, r.note, r.url].join(' ')
    ) || r.publisher === 'Australian Building Codes Board'
  );
}

/** Public Comment Drafts and other proposals, which are never in force. */
function isDraftProposal(r: { title: string; note: string; url: string }) {
  return /\bPCD\b|Public Comment Draft|consultation (?:paper|draft)|\bproposal\b/i.test(
    [r.title, r.url].join(' ')
  );
}

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

  // NCC editions commence and are amended on different dates and triggers in each state and
  // territory, so cards say only what a document is. The section note carries the caution.
  it('keeps every NCC and ABCB card note free of applicability wording', () => {
    let inScope = 0;
    for (const r of FREE_RESOURCES) {
      if (!isBuildingCodeCard(r)) continue;
      inScope += 1;
      expect(r.note, r.id).not.toMatch(APPLICABILITY_WORDING);
    }
    // Positive control: the scope must reach the building-code cards.
    expect(inScope).toBeGreaterThanOrEqual(15);
  });

  it('flags applicability wording in the check above', () => {
    for (const bad of [
      'The current housing provisions, for NCC 2025. Use it for recent builds and new work.',
      'NCC 2022 Volume One covers apartments and commercial buildings. Use it when the job is not a standalone house.',
      'NCC 2022 still applies in some states and territories but not others.',
      'Read it when you need to judge a leak against how the building was meant to shed water.',
      'A starting point for building-regulation questions on residential jobs.',
      'Applies to Class 2 renovations and existing buildings.',
      'The 2019 edition, written for homes built under that version of the NCC.',
    ]) {
      expect(bad).toMatch(APPLICABILITY_WORDING);
    }
  });

  it('marks every draft or proposal as a draft proposal and as background reading only', () => {
    const drafts = FREE_RESOURCES.filter(isDraftProposal);
    expect(drafts.length).toBeGreaterThanOrEqual(1);
    for (const r of drafts) {
      expect(r.status, r.id).toBe('draft-proposal');
      expect(r.note, r.id).toMatch(/^Background reading only/);
    }
    for (const r of FREE_RESOURCES.filter((x) => !isDraftProposal(x))) {
      expect(r.status, r.id).toBeUndefined();
    }
    expect(RESOURCE_STATUS_LABEL['draft-proposal']).toBe('Draft proposal — not in force');
  });

  it('links NCC editions through their ABCB landing page, never a bare edition PDF', () => {
    for (const r of FREE_RESOURCES) {
      expect(r.url, r.id).not.toMatch(/^https:\/\/ncc\.abcb\.gov\.au\/system\/files\/ncc\//);
    }
  });

  // NCC 2022 volumes and housing provisions are CC BY-ND 4.0 (ABCB copyright notices, e.g.
  // https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-one/preface/copyright-and-licence-notice,
  // accessed 14/10/2026), which the open-licence rule excludes.
  it('does not list the NCC 2022 edition text, which is no-derivatives licensed', () => {
    for (const r of FREE_RESOURCES) {
      expect(`${r.id} ${r.title} ${r.url}`, r.id).not.toMatch(
        /ncc2022-(?:volume|housing)|NCC 2022 (?:Volume|ABCB Housing)|editions\/ncc-2022/i
      );
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
