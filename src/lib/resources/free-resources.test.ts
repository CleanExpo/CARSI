import { describe, expect, it } from 'vitest';

import { RESOURCE_CATEGORIES } from './categories';
import {
  RESOURCE_STATUS_LABEL,
  FREE_RESOURCES,
  FREE_RESOURCE_JURISDICTIONS,
  isBuildingCodeResource,
} from './free-resources';
import { BUILDING_CODE_NOTE } from '@/components/resources/ResourcesBrowser';

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
  'www.qld.gov.au',
  'www.getready.qld.gov.au',
  'www.epa.vic.gov.au',
  'www.legislation.govt.nz',
  'www.building.govt.nz',
]);

/**
 * Each publisher, as named on its cards, and the only hosts its cards may link to or take a
 * licence notice from. Both a card's url and its licence notice must sit on its own publisher's
 * hosts, so swapping both to another government body's site fails, and an unknown publisher
 * fails until it is added here deliberately.
 */
const PUBLISHER_HOSTS: Record<string, readonly string[]> = {
  'Australian Building Codes Board': ['www.abcb.gov.au', 'ncc.abcb.gov.au'],
  'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)':
    ['www.yourhome.gov.au'],
  'Queensland Government (Long Paddock)': ['www.longpaddock.qld.gov.au'],
  'Queensland Building and Construction Commission': ['www.qbcc.qld.gov.au'],
  // Queensland departments publish on the shared business.qld.gov.au and publications.qld.gov.au
  // sites. business.qld.gov.au pages are (c) The State of Queensland and their footer "Copyright"
  // link is qld.gov.au/legal/copyright; the site has no copyright page of its own (checked
  // 14/10/2026: /about/copyright returns 404).
  'Queensland Department of Agriculture and Fisheries': [
    'www.business.qld.gov.au',
    'www.publications.qld.gov.au',
    'www.qld.gov.au',
  ],
  'Queensland Department of Housing and Public Works': [
    'www.business.qld.gov.au',
    'www.getready.qld.gov.au',
    'www.qld.gov.au',
  ],
  'Queensland Department of Energy and Public Works': ['www.qld.gov.au'],
  'Queensland Reconstruction Authority': ['www.qra.qld.gov.au'],
  'Ministry of Business, Innovation and Employment (NZ)': ['www.building.govt.nz'],
  'Australian Institute for Disaster Resilience': ['knowledge.aidr.org.au'],
  'New Zealand Parliamentary Counsel Office': ['www.legislation.govt.nz'],
  'EPA Victoria': ['www.epa.vic.gov.au'],
  'Safe Work Australia': ['www.safeworkaustralia.gov.au'],
};

/**
 * A licence notice must sit on the same host as the card's own page, unless that page's site has
 * no notice of its own and designates another one. Evidence for each designation is in the comment.
 */
const DESIGNATED_NOTICE_HOSTS: Record<string, readonly string[]> = {
  // business.qld.gov.au: footer "Copyright" link is qld.gov.au/legal/copyright; no page of its own.
  'www.business.qld.gov.au': ['www.qld.gov.au'],
};

function hostsBelongToPublisher(r: {
  publisher: string;
  url: string;
  licenceEvidence: { url: string };
}) {
  const allowed = PUBLISHER_HOSTS[r.publisher];
  if (!allowed) return false;
  const pageHost = new URL(r.url).hostname;
  const noticeHost = new URL(r.licenceEvidence.url).hostname;
  if (!allowed.includes(pageHost) || !allowed.includes(noticeHost)) return false;
  return noticeHost === pageHost || (DESIGNATED_NOTICE_HOSTS[pageHost] ?? []).includes(noticeHost);
}

/** True when the quoted notice names the same open licence as the card's label, and no restriction. */
function quoteNamesLicence(label: string, quote: string): boolean {
  if (/non-?commercial|no ?deriv|\b(?:NC|ND)\b|all rights reserved|permission/i.test(quote))
    return false;
  if (label === 'No copyright (NZ legislation)') {
    return /no copyright in New Zealand legislation/i.test(quote);
  }
  const m = /^CC BY (\d\.\d)$/.exec(label);
  if (!m) return false;
  const v = m[1].replace('.', '\\.');
  return new RegExp(
    `Creative Commons Attribution[\\s\\-\u2013\u2014]*(?:\\(CC BY\\)\\s*)?${v}\\b|\\bCC BY ${v}\\b`,
    'i'
  ).test(quote);
}

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

/**
 * Nationwide or absolute claims about building rules. Adoption is decided by each state and
 * territory, so no card note and not the section note may assert one.
 */
const ABSOLUTE_WORDING =
  /\b(national(?:ly|wide)?|across Australia|all (?:Australian|states|territories|jurisdictions|buildings)|every (?:state|territory|jurisdiction|building)|everywhere|always|mandatory|compulsory|must|required|requires|universal(?:ly)?|in force|binding)\b/i;

/** Drafts, proposals and consultation material, wherever the card says so. */
function isDraftProposal(r: { title: string; note: string; url: string }) {
  return /\b(?:drafts?|proposals?|proposed|consultation|public comment|PCD)\b/i.test(
    [r.title, r.note, r.url].join(' ')
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

  it('offers only jurisdictions that have at least one resource', () => {
    expect(FREE_RESOURCE_JURISDICTIONS.length).toBeGreaterThan(0);
    for (const j of FREE_RESOURCE_JURISDICTIONS) {
      expect(
        FREE_RESOURCES.some((r) => r.jurisdiction === j),
        `${j} has no resource`
      ).toBe(true);
    }
  });

  it('links each item to an https URL on the publisher official host', () => {
    for (const r of FREE_RESOURCES) {
      const url = new URL(r.url);
      expect(url.protocol, r.id).toBe('https:');
      expect(OFFICIAL_HOSTS.has(url.hostname), `${r.id} host ${url.hostname}`).toBe(true);
    }
  });

  it('records, for every card, the publisher notice its licence was read from', () => {
    for (const r of FREE_RESOURCES) {
      expect(r.licence, r.id).toMatch(OPEN_LICENCE);
      const ev = r.licenceEvidence;
      expect(ev, r.id).toBeDefined();
      expect(new URL(ev.url).protocol, r.id).toBe('https:');
      expect(ev.locator.trim().length, `${r.id} locator`).toBeGreaterThan(0);
      const words = ev.quote.trim().split(/\s+/).filter(Boolean).length;
      expect(words, `${r.id} quote length`).toBeGreaterThan(0);
      expect(words, `${r.id} quote length`).toBeLessThanOrEqual(25);
      expect(ev.readOn, `${r.id} readOn`).toBe('2026-10-14');
      // The notice must come from the card's own publisher and site, not another body.
      expect(hostsBelongToPublisher(r), `${r.id} ${r.publisher}: ${r.url} / ${ev.url}`).toBe(true);
      // The quoted sentence must name the licence shown on the card.
      expect(quoteNamesLicence(r.licence, ev.quote), `${r.id}: ${ev.quote}`).toBe(true);
    }
  });

  it("rejects another publisher's hosts, undesignated notices and unknown publishers", () => {
    const abcb = FREE_RESOURCES.find((r) => r.publisher === 'Australian Building Codes Board');
    if (!abcb) throw new Error('positive control: no ABCB card');
    expect(hostsBelongToPublisher(abcb)).toBe(true);
    const qld = 'https://www.qld.gov.au/legal/copyright';
    const qldEv = { ...abcb.licenceEvidence, url: qld };
    // Notice alone, url alone, and both together moved to another government publisher.
    expect(hostsBelongToPublisher({ ...abcb, licenceEvidence: qldEv })).toBe(false);
    expect(hostsBelongToPublisher({ ...abcb, url: qld })).toBe(false);
    expect(hostsBelongToPublisher({ ...abcb, url: qld, licenceEvidence: qldEv })).toBe(false);
    expect(hostsBelongToPublisher({ ...abcb, publisher: 'Unlisted Publisher' })).toBe(false);
    // Get Ready has no designated notice elsewhere: the qld.gov.au page cannot license its PDF.
    const getReady = FREE_RESOURCES.find(
      (r) => r.id === 'qld-design-guidance-flood-resilient-homes-2026'
    );
    if (!getReady) throw new Error('positive control: no Get Ready card');
    expect(hostsBelongToPublisher(getReady)).toBe(true);
    expect(
      hostsBelongToPublisher({
        ...getReady,
        licenceEvidence: { ...getReady.licenceEvidence, url: qld },
      })
    ).toBe(false);
  });

  it('rejects a quote that names a different or restricted licence', () => {
    expect(
      quoteNamesLicence(
        'CC BY 4.0',
        'licensed under a Creative Commons Attribution 4.0 International licence'
      )
    ).toBe(true);
    expect(
      quoteNamesLicence('CC BY 4.0', 'licensed under a Creative Commons Attribution 3.0 licence')
    ).toBe(false);
    expect(
      quoteNamesLicence(
        'CC BY 4.0',
        'Creative Commons Attribution-NoDerivatives 4.0 International licence'
      )
    ).toBe(false);
    expect(
      quoteNamesLicence('CC BY 4.0', 'Creative Commons Attribution-NonCommercial 4.0 licence')
    ).toBe(false);
    expect(quoteNamesLicence('CC BY 4.0', 'All rights reserved')).toBe(false);
    expect(quoteNamesLicence('No copyright (NZ legislation)', 'Crown copyright applies')).toBe(
      false
    );
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
      if (!isBuildingCodeResource(r)) continue;
      inScope += 1;
      expect(r.note, r.id).not.toMatch(APPLICABILITY_WORDING);
      expect(r.note, r.id).not.toMatch(ABSOLUTE_WORDING);
    }
    // Positive control: the scope must reach the building-code cards.
    expect(inScope).toBeGreaterThanOrEqual(15);
  });

  it('keeps the building-code section note free of nationwide or absolute claims', () => {
    expect(BUILDING_CODE_NOTE).not.toMatch(ABSOLUTE_WORDING);
  });

  it('flags nationwide and absolute claims in the checks above', () => {
    for (const bad of [
      'NCC 2025 is mandatory for all Australian buildings.',
      'The NCC applies nationally.',
      'These provisions are in force across Australia.',
      'This edition always applies, everywhere.',
      'Every state has adopted it.',
    ]) {
      expect(bad).toMatch(ABSOLUTE_WORDING);
    }
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
    // A draft described only in its note is still a draft.
    expect(
      isDraftProposal({
        title: 'Condensation guidance',
        url: 'https://www.abcb.gov.au/x.pdf',
        note: 'Public Comment Draft guidance on condensation in buildings.',
      })
    ).toBe(true);
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
