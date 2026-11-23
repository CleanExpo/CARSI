// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { carsiLinkPathFromAnchor } from './carsi-link-path';

describe('carsiLinkPathFromAnchor', () => {
  it('returns a counted route form for same-origin course links', () => {
    document.body.innerHTML = '<a id="a" href="/courses/water-damage-restoration">x</a>';
    const a = document.getElementById('a') as HTMLAnchorElement;
    expect(carsiLinkPathFromAnchor(a, window.location.origin)).toBe('/courses/:slug');
  });

  it('drops cross-origin and private dashboard links', () => {
    document.body.innerHTML = '<a id="b" href="https://evil.example/courses/x">x</a>';
    expect(
      carsiLinkPathFromAnchor(document.getElementById('b') as HTMLAnchorElement, window.location.origin)
    ).toBeUndefined();

    document.body.innerHTML = '<a id="c" href="/dashboard">x</a>';
    expect(carsiLinkPathFromAnchor(document.getElementById('c') as HTMLAnchorElement, window.location.origin)).toBeUndefined();
  });
});