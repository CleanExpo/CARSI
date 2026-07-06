import { describe, expect, it } from 'vitest';

import { parseMargotMarkdown } from './parse-message-markdown';

describe('parseMargotMarkdown', () => {
  it('parses headings, tables, and links', () => {
    const text = `### Free Courses

| Course | Category |
| --- | --- |
| [WRT](/courses/wrt) | Water |

- First item`;

    const blocks = parseMargotMarkdown(text);
    expect(blocks[0]).toEqual({ type: 'heading', level: 3, text: 'Free Courses' });
    expect(blocks[1]?.type).toBe('table');
    if (blocks[1]?.type === 'table') {
      expect(blocks[1].headers).toEqual(['Course', 'Category']);
      expect(blocks[1].rows[0][0]).toContain('[WRT](/courses/wrt)');
    }
    expect(blocks[2]).toEqual({ type: 'list', items: ['First item'] });
  });
});
