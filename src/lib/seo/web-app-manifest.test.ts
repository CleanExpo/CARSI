/**
 * The installable-app manifest (public/manifest.json). Live on 18/10/2026 it opened the
 * installed app at /student (a redirect into the logged-in area, disallowed in robots.txt),
 * declared no scope, id or maskable icon, and its "512x512" icon was really 1024x1024.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import nextConfig from '../../../next.config';
import robots from '../../../app/robots';
import { readPngInfo } from './png-info';

const PUBLIC = join(process.cwd(), 'public');

type Icon = { src: string; sizes: string; type?: string; purpose?: string };
type Manifest = Record<string, unknown> & { icons: Icon[] };

const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf8')) as Manifest;

function disallowedForAll(): string[] {
  const rules = robots().rules;
  const all = (Array.isArray(rules) ? rules : [rules]).find((r) => r.userAgent === '*');
  const d = all?.disallow ?? [];
  return Array.isArray(d) ? d : [d];
}

describe('web app manifest', () => {
  it('declares the installability fields', () => {
    for (const key of [
      'id',
      'name',
      'short_name',
      'start_url',
      'scope',
      'display',
      'theme_color',
      'background_color',
      'lang',
    ]) {
      expect(manifest[key], key).toBeTruthy();
    }
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
    expect(manifest.lang).toBe('en-AU');
    expect(String(manifest.short_name).length).toBeLessThanOrEqual(12);
  });

  it('starts inside its scope, on a public page that is neither redirected nor disallowed', async () => {
    const start = new URL(String(manifest.start_url), 'https://carsi.com.au');
    const scope = new URL(String(manifest.scope), 'https://carsi.com.au');
    expect(start.pathname.startsWith(scope.pathname)).toBe(true);
    for (const rule of disallowedForAll())
      expect(start.pathname.startsWith(rule), rule).toBe(false);
    const sources = ((await nextConfig.redirects?.()) ?? []).map((r) => r.source);
    expect(sources).not.toContain(start.pathname);
  });

  it('ships 192 and 512 icons whose files exist at the declared size', () => {
    const declared = new Set(manifest.icons.map((i) => i.sizes));
    expect(declared).toContain('192x192');
    expect(declared).toContain('512x512');
    for (const icon of manifest.icons) {
      const file = join(PUBLIC, icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const { width, height } = readPngInfo(file);
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
    }
  });

  it('includes an opaque maskable icon of at least 512px', () => {
    const maskable = manifest.icons.filter((i) =>
      (i.purpose ?? 'any').split(/\s+/).includes('maskable')
    );
    expect(maskable.length).toBeGreaterThan(0);
    const info = readPngInfo(join(PUBLIC, maskable[0].src));
    expect(info.width).toBeGreaterThanOrEqual(512);
    expect(info.hasTransparency).toBe(false);
  });
});
