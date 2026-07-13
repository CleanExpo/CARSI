import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { margotStreamingEnabled } from '../margot-streaming-flag';
import {
  executeToolCall,
  getFrontDeskTool,
  getFrontDeskTools,
  toolsForRequest,
} from './registry';
import { filterCourses } from './tools/find-courses';

const SAMPLE = [
  {
    slug: 'water-damage-basics',
    title: 'Water Damage Basics',
    shortDescription: 'Extraction and drying fundamentals.',
    category: 'Restoration',
    iicrcDiscipline: 'WRT',
    priceAud: 199,
    isFree: false,
  },
  {
    slug: 'mould-remediation',
    title: 'Mould Remediation Essentials',
    shortDescription: 'Containment and Condition 1 clearance for mould.',
    category: 'Restoration',
    iicrcDiscipline: null,
    priceAud: 0,
    isFree: true,
  },
  {
    slug: 'carpet-cleaning',
    title: 'Carpet Cleaning',
    shortDescription: 'Hot-water extraction methods.',
    category: 'Cleaning',
    iicrcDiscipline: null,
    priceAud: 149,
    isFree: false,
  },
];

describe('front-desk registry invariants', () => {
  it('default tool set (no write) is entirely read-only', () => {
    const tools = getFrontDeskTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) expect(t.readOnly).toBe(true);
  });

  it('write tools are only included with includeWrite AND are confirm-gated', () => {
    const withWrite = getFrontDeskTools({ includeWrite: true });
    const writeTools = withWrite.filter((t) => !t.readOnly);
    expect(writeTools.length).toBeGreaterThan(0);
    // Hard invariant: any non-read-only tool MUST require confirmation.
    for (const t of writeTools) {
      expect(t.readOnly).toBe(false);
      if (!t.readOnly) expect(t.requiresConfirmation).toBe(true);
    }
    // ...and the default set must NOT contain them.
    expect(getFrontDeskTools().some((t) => !t.readOnly)).toBe(false);
  });

  it('registers find_courses and renders an OpenAI-shaped tools payload', () => {
    expect(getFrontDeskTool('find_courses')).toBeDefined();
    const payload = toolsForRequest();
    expect(payload[0]).toMatchObject({
      type: 'function',
      function: { name: 'find_courses' },
    });
    expect(payload[0]?.function.parameters).toHaveProperty('properties.query');
  });

  it('returns a structured error for an unknown tool (never throws)', async () => {
    const out = await executeToolCall(
      { id: 'c1', type: 'function', function: { name: 'delete_everything', arguments: '{}' } },
      getFrontDeskTools()
    );
    expect(JSON.parse(out.forModel)).toHaveProperty('error');
  });

  it('returns a structured error for malformed argument JSON (never throws)', async () => {
    const out = await executeToolCall(
      { id: 'c2', type: 'function', function: { name: 'find_courses', arguments: '{not json' } },
      getFrontDeskTools()
    );
    expect(JSON.parse(out.forModel)).toHaveProperty('error');
  });
});

describe('find_courses is a read-only tool', () => {
  it('contains no Prisma write calls in its source', () => {
    const src = readFileSync(join(__dirname, 'tools', 'find-courses.ts'), 'utf8');
    for (const write of ['.create(', '.update(', '.delete(', '.upsert(', '.createMany(', '.deleteMany(']) {
      expect(src).not.toContain(write);
    }
    expect(src).toContain('.findMany(');
  });
});

describe('filterCourses (pure keyword search)', () => {
  it('matches on a keyword across title and description', () => {
    const hits = filterCourses(SAMPLE, 'mould');
    expect(hits.map((h) => h.slug)).toContain('mould-remediation');
    expect(hits.map((h) => h.slug)).not.toContain('carpet-cleaning');
  });

  it('ranks courses matching more terms higher', () => {
    const hits = filterCourses(SAMPLE, 'water damage');
    expect(hits[0]?.slug).toBe('water-damage-basics');
  });

  it('returns the whole catalogue for an empty query', () => {
    expect(filterCourses(SAMPLE, '').length).toBe(SAMPLE.length);
  });

  it('formats free courses as "Free" and priced courses in AUD', () => {
    const [free] = filterCourses(SAMPLE, 'mould');
    expect(free?.price).toBe('Free');
    const [paid] = filterCourses(SAMPLE, 'carpet');
    expect(paid?.price).toBe('AUD 149.00');
  });
});

describe('margotStreamingEnabled flag', () => {
  const original = process.env.MARGOT_STREAMING;
  afterEach(() => {
    if (original === undefined) delete process.env.MARGOT_STREAMING;
    else process.env.MARGOT_STREAMING = original;
  });

  it('defaults to off when unset', () => {
    delete process.env.MARGOT_STREAMING;
    expect(margotStreamingEnabled()).toBe(false);
  });

  it('is on for truthy values and off otherwise', () => {
    for (const v of ['true', '1', 'yes', 'on', 'TRUE']) {
      process.env.MARGOT_STREAMING = v;
      expect(margotStreamingEnabled()).toBe(true);
    }
    for (const v of ['false', '0', 'off', '']) {
      process.env.MARGOT_STREAMING = v;
      expect(margotStreamingEnabled()).toBe(false);
    }
  });
});
