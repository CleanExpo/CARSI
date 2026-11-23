#!/usr/bin/env node
/**
 * Capture Playwright screenshots at 390 / 768 / 1440 for SDA visual evidence.
 * Usage:
 *   SDA_BASE_URL=http://127.0.0.1:3000 SDA_PATHS=/,/courses npm run quality:sda-capture
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'artifacts/sda-evidence');
const WIDTHS = [390, 768, 1440];
const base = (process.env.SDA_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const paths = (process.env.SDA_PATHS ?? '/,/courses,/about')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

const manifest = [];
for (const path of paths) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    }
    const slug = path.replace(/\//g, '_').replace(/^_/, '') || 'home';
    const file = `${slug}-${width}.png`;
    const dest = join(OUT, file);
    await page.screenshot({ path: dest, fullPage: true });
    manifest.push({ url, width, file: `artifacts/sda-evidence/${file}` });
    await ctx.close();
  }
}

writeFileSync(
  join(OUT, 'manifest.json'),
  `${JSON.stringify({ capturedAt: new Date().toISOString(), items: manifest }, null, 2)}\n`
);
await browser.close();
console.log(`Captured ${manifest.length} screenshots under artifacts/sda-evidence/`);