import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CATALOGUE_TOPIC_TABS,
  LEGACY_URL_CODES,
  resolveDisciplineParam,
} from './discipline-param';

describe('resolveDisciplineParam (GP-592)', () => {
  it('routes the CCT deep link to the Cleaning tab, not All', () => {
    expect(resolveDisciplineParam('CCT')).toBe('Cleaning');
    expect(resolveDisciplineParam('cct')).toBe('Cleaning');
  });

  it('routes every legacy code used by live links to a real topic tab', () => {
    for (const code of ['WRT', 'CRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'CCT']) {
      const tab = resolveDisciplineParam(code);
      expect(tab, code).toBeDefined();
      expect(CATALOGUE_TOPIC_TABS).toContain(tab);
    }
  });

  it('accepts topic labels in any case and slug form', () => {
    expect(resolveDisciplineParam('Cleaning')).toBe('Cleaning');
    expect(resolveDisciplineParam('water-damage')).toBe('Water Damage');
    expect(resolveDisciplineParam('fire-and-smoke')).toBe('Fire & Smoke');
    expect(resolveDisciplineParam('MOULD')).toBe('Mould');
  });

  it('leaves empty or unknown values to the All view', () => {
    expect(resolveDisciplineParam(undefined)).toBeUndefined();
    expect(resolveDisciplineParam('')).toBeUndefined();
    expect(resolveDisciplineParam('not-a-topic')).toBeUndefined();
  });

  it('uses the first value when the param repeats', () => {
    expect(resolveDisciplineParam(['CCT', 'WRT'])).toBe('Cleaning');
  });

  it('every legacy code maps to a tab that exists', () => {
    for (const tab of Object.values(LEGACY_URL_CODES)) {
      expect(CATALOGUE_TOPIC_TABS).toContain(tab);
    }
  });

  it('stays in step with CourseGrid DISCIPLINE_TABS', () => {
    const grid = readFileSync(
      join(process.cwd(), 'src', 'components', 'lms', 'CourseGrid.tsx'),
      'utf8'
    );
    const block = grid.match(/const DISCIPLINE_TABS = \[([\s\S]*?)\] as const/);
    expect(block).not.toBeNull();
    const tabs = [...block![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(tabs).toEqual([...CATALOGUE_TOPIC_TABS]);
  });
});
