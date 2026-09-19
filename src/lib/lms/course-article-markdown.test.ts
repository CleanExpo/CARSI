import { describe, expect, it } from 'vitest';

import {
  composeCourseArticle,
  mergeModulesFromArticle,
  parseCourseArticle,
} from './course-article-markdown';

describe('composeCourseArticle / parseCourseArticle', () => {
  it('round-trips title, lead and two modules', () => {
    const article = composeCourseArticle({
      title: 'Water damage',
      description: 'A lead for the buyer.',
      modules: [
        { title: 'Extract', textContent: 'Pull the standing water.' },
        { title: 'Dry', textContent: 'Prove it dry.' },
      ],
    });
    expect(article).toContain('# Water damage');
    expect(article).toContain('## Module 1 — Extract');
    expect(article).toContain('## Module 2 — Dry');
    const parsed = parseCourseArticle(article);
    expect(parsed.title).toBe('Water damage');
    expect(parsed.description).toBe('A lead for the buyer.');
    expect(parsed.sections).toEqual([
      { title: 'Extract', body: 'Pull the standing water.' },
      { title: 'Dry', body: 'Prove it dry.' },
    ]);
  });

  it('treats copy before the first ## as the course lead', () => {
    const parsed = parseCourseArticle('# Title\n\nLead paragraph.\n\n## One\n\nBody');
    expect(parsed.description).toBe('Lead paragraph.');
    expect(parsed.sections[0]).toEqual({ title: 'One', body: 'Body' });
  });

  it('splits a visual HTML article on h1 and h2', () => {
    const parsed = parseCourseArticle(
      '<h1>Indoor assessment</h1><p>A lead &mdash; for the buyer.</p><h2>Module 1 — Scope</h2><p>Walk the building.</p>'
    );
    expect(parsed.title).toBe('Indoor assessment');
    expect(parsed.description).toContain('A lead');
    expect(parsed.sections[0]?.title).toBe('Scope');
    expect(parsed.sections[0]?.body).toContain('Walk the building');
  });
});

describe('mergeModulesFromArticle', () => {
  it('keeps video URLs when the ## title still matches', () => {
    const merged = mergeModulesFromArticle(
      [
        {
          key: 'a',
          id: 'id-a',
          title: 'Extract',
          textContent: 'old',
          videoUrl: 'https://example.com/a.mp4',
        },
      ],
      [{ title: 'Extract', body: 'new body' }],
      () => 'new'
    );
    expect(merged).toEqual([
      {
        key: 'a',
        id: 'id-a',
        title: 'Extract',
        textContent: 'new body',
        videoUrl: 'https://example.com/a.mp4',
      },
    ]);
  });

  it('keeps a leftover module that only has a video', () => {
    const merged = mergeModulesFromArticle(
      [
        { key: 'a', title: 'Reading', textContent: 'x', videoUrl: '' },
        { key: 'b', title: 'Demo', textContent: '', videoUrl: 'https://v.example/x' },
      ],
      [{ title: 'Reading', body: 'only reading' }],
      () => 'new'
    );
    expect(merged.map((m) => m.title)).toEqual(['Reading', 'Demo']);
    expect(merged[1]?.videoUrl).toContain('v.example');
  });
});
