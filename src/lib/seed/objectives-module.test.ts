import { describe, expect, it } from 'vitest';

import { hoistObjectivesFirst, isObjectivesModuleTitle } from './objectives-module';

describe('objectives-module ordering (GP-434)', () => {
  it('recognises the objectives module title (case/space/suffix tolerant)', () => {
    expect(isObjectivesModuleTitle('WHAT YOU WILL LEARN')).toBe(true);
    expect(isObjectivesModuleTitle('  what you will learn  ')).toBe(true);
    expect(isObjectivesModuleTitle('WHAT YOU WILL LEARN last')).toBe(true);
    expect(isObjectivesModuleTitle('Safety')).toBe(false);
    expect(isObjectivesModuleTitle('What you will do next')).toBe(false);
  });

  it('hoists a trailing objectives module to the front', () => {
    const modules = [
      { title: 'Extraction' },
      { title: 'Safety' },
      { title: 'WHAT YOU WILL LEARN' },
    ];
    expect(hoistObjectivesFirst(modules).map((m) => m.title)).toEqual([
      'WHAT YOU WILL LEARN',
      'Extraction',
      'Safety',
    ]);
  });

  it('preserves the relative order of all non-objectives modules (stable partition)', () => {
    const modules = [
      { title: 'A' },
      { title: 'B' },
      { title: 'WHAT YOU WILL LEARN' },
      { title: 'C' },
      { title: 'D' },
    ];
    expect(hoistObjectivesFirst(modules).map((m) => m.title)).toEqual([
      'WHAT YOU WILL LEARN',
      'A',
      'B',
      'C',
      'D',
    ]);
  });

  it('is a no-op when there is no objectives module', () => {
    const modules = [{ title: 'A' }, { title: 'B' }];
    expect(hoistObjectivesFirst(modules)).toBe(modules);
  });
});
