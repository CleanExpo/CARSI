/**
 * Icon links in the root metadata. Live on 18/10/2026 one 512x512 PNG was declared as the
 * 512, the 32 and the 180x180 apple-touch-icon; iOS also paints its transparent corners black.
 * Every declared size must be the file's real size, and the apple-touch-icon must be an
 * opaque 180x180 PNG.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { readPngInfo } from './png-info';

vi.setConfig({ testTimeout: 30_000 });

vi.mock('next/font/google', () => ({
  Outfit: () => ({ variable: 'font-display' }),
  Plus_Jakarta_Sans: () => ({ variable: 'font-sans' }),
}));

type IconDescriptor = { url: string; sizes?: string; type?: string };

function asList(value: unknown): IconDescriptor[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((v) =>
    typeof v === 'string' ? { url: v } : (v as IconDescriptor)
  );
}

async function iconSets() {
  const { metadata } = await import('../../../app/layout');
  const icons = metadata.icons as Record<string, unknown>;
  return { icon: asList(icons.icon), apple: asList(icons.apple), shortcut: asList(icons.shortcut) };
}

const file = (url: string) => join(process.cwd(), 'public', url);

describe('root metadata icons', () => {
  it('every icon file exists and every declared PNG size is the real size', async () => {
    const sets = await iconSets();
    for (const icon of [...sets.icon, ...sets.apple, ...sets.shortcut]) {
      expect(existsSync(file(icon.url)), icon.url).toBe(true);
      if (icon.sizes && icon.url.endsWith('.png')) {
        const { width, height } = readPngInfo(file(icon.url));
        expect(`${width}x${height}`, icon.url).toBe(icon.sizes);
      }
    }
  });

  it('declares an opaque 180x180 apple-touch-icon', async () => {
    const { apple } = await iconSets();
    expect(apple.length).toBeGreaterThan(0);
    const info = readPngInfo(file(apple[0].url));
    expect(`${info.width}x${info.height}`).toBe('180x180');
    expect(info.hasTransparency).toBe(false);
  });

  it('declares iOS home-screen web-app metadata', async () => {
    const { metadata } = await import('../../../app/layout');
    expect(metadata.appleWebApp).toMatchObject({ capable: true, title: 'CARSI' });
  });
});
