// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { resolveCarsiDataEventTarget } from './resolve-carsi-data-event-target';

describe('resolveCarsiDataEventTarget', () => {
  it('finds the nearest data-carsi-event ancestor', () => {
    document.body.innerHTML = `
      <a data-carsi-event="course_cta" href="/courses/x">
        <span id="inner">View</span>
      </a>
    `;
    const inner = document.getElementById('inner');
    expect(resolveCarsiDataEventTarget(inner)?.getAttribute('data-carsi-event')).toBe('course_cta');
  });

  it('returns null when no attribute in the chain', () => {
    document.body.innerHTML = '<button type="button">Go</button>';
    expect(resolveCarsiDataEventTarget(document.querySelector('button'))).toBeNull();
  });
});