/**
 * Where check-visuals finds its config when no --config is given.
 *
 * main moved visuals.config.json into config/ (92b3593b) but the scanner still looked only at
 * the repo root. With no config found it fell back to its built-in "enforce" mode, so every pull
 * request that touched a scanned file went red on 600 repo-wide findings, while the committed
 * config says "report". The scanner now reads config/visuals.config.json first and the root file
 * second, so both layouts mean what their committed config says.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../../scripts/premium-visuals/check-visuals.mjs');
const made: string[] = [];

/** A fixture whose only finding is an unmanifested public image, so enforce fails and report passes. */
function fixture(configAt: string | null, mode: 'report' | 'enforce'): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-config-path-'));
  made.push(root);
  const write = (rel: string, body: string | Buffer) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body);
  };
  write('public/media/stray.webp', Buffer.from('RIFF0000WEBPVP8 '));
  write('app/page.tsx', 'export default function Page() { return <main>Plain</main>; }\n');
  if (configAt) write(configAt, JSON.stringify({ mode, minMarketingPages: 0 }));
  return root;
}

function run(root: string) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
  });
  return { status: r.status, out: r.stdout + r.stderr };
}

afterAll(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

describe('check-visuals config location', () => {
  it('reads config/visuals.config.json when that is where the repo keeps it', () => {
    const r = run(fixture('config/visuals.config.json', 'report'));
    expect(r.out).toMatch(/check-visuals \(report-only\)/);
    expect(r.status).toBe(0);
  });

  it('still reads a root visuals.config.json', () => {
    const r = run(fixture('visuals.config.json', 'report'));
    expect(r.out).toMatch(/check-visuals \(report-only\)/);
    expect(r.status).toBe(0);
  });

  it('enforces a config/ enforce config (the location change is not a way out)', () => {
    const r = run(fixture('config/visuals.config.json', 'enforce'));
    expect(r.out).toMatch(/check-visuals \(enforce\)/);
    expect(r.status).toBe(1);
  });

  it('with no config anywhere it still fails closed in enforce mode', () => {
    const r = run(fixture(null, 'enforce'));
    expect(r.out).toMatch(/check-visuals \(enforce\)/);
    expect(r.status).toBe(1);
  });
});
