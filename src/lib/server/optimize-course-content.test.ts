import { describe, expect, it } from 'vitest';

import {
  draftFromApplyBody,
  extractJsonObject,
  extractModuleBody,
  htmlToPlain,
  parseOptimizedModules,
  scrubAiWriting,
} from './optimize-course-content';

function para(n: number): string {
  return `Paragraph ${n}. On a wet job you walk the rooms before you plug anything in. ${'Check the water line, the furniture, and what the owner already moved. '.repeat(3)}`;
}

describe('optimize-course-content parsers', () => {
  it('strips html to readable foundation text', () => {
    expect(htmlToPlain('<p>First</p><p>Second<br/>line</p>')).toMatch(/First/);
    expect(htmlToPlain('<p>First</p><p>Second<br/>line</p>')).toMatch(/Second/);
  });

  it('extracts JSON from fenced model output', () => {
    const raw = 'Here you go\n```json\n{"modules":[]}\n```\n';
    expect(extractJsonObject(raw)).toEqual({ modules: [] });
  });

  it('reads a plain module body and salvages truncated JSON', () => {
    const body = `${para(1)}\n\n${para(2)}`;
    expect(extractModuleBody(body)).toContain('Paragraph 1');
    expect(extractModuleBody(`{"textContent":"${body.slice(0, 80)}`)).toContain('Paragraph');
    expect(extractJsonObject('{"modules":[],}')).toEqual({ modules: [] });
  });

  it('strips dashes and AI filler from module prose', () => {
    const cleaned = scrubAiWriting(
      'It is important to note the dryer — a comprehensive setup – works. Leverage this on site.'
    );
    expect(cleaned).not.toMatch(/[—–]/);
    expect(cleaned.toLowerCase()).not.toMatch(/it is important to note|comprehensive|leverage/);
  });

  it('reads a save payload from the review screen', () => {
    const body = draftFromApplyBody({
      token: 'abc',
      title: 'Course',
      modules: [{ title: 'One', textContent: para(1) }],
    });
    expect(body?.token).toBe('abc');
    expect(body?.modules).toHaveLength(1);
  });

  it('accepts matching module count and rejects thin ones', () => {
    const modules = Array.from({ length: 3 }, (_, i) => ({
      title: `Module ${i + 1}`,
      textContent: [para(1), para(2), para(3), para(4)].join('\n\n'),
    }));
    expect(parseOptimizedModules({ modules }, { expectedCount: 3 })).toHaveLength(3);
    expect(() =>
      parseOptimizedModules(
        { modules: [{ title: 'Thin', textContent: 'Too short.' }] },
        { expectedCount: 3 }
      )
    ).toThrow(/expected 3/);
  });
});
