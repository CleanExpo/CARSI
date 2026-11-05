/**
 * Reticle's project file must stay at the repository root as `.reticle.json`.
 *
 * `@reticlehq/next` reads it from `path.join(process.cwd(), '.reticle.json')` with no option or
 * environment variable to point elsewhere. When the file moved to `config/` (GP-684), discovery
 * returned nothing and `next dev` silently fell back to the default daemon port, with no error
 * anywhere. This test calls Reticle's own discovery function against the repository root, so it
 * fails if the file moves again, is renamed, or loses its `projectId`.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// `discoverDaemonUrl` is exported by index.cjs but not declared in the package's index.d.ts,
// so it is loaded untyped and given the signature from the 2.14.0 source.
const { discoverDaemonUrl } = createRequire(import.meta.url)('@reticlehq/next') as {
  discoverDaemonUrl: (
    cwd?: string,
    home?: string,
    alive?: (pid: number) => boolean
  ) => string | undefined;
};

const ROOT = process.cwd();
const FLOWS_DIR = join(ROOT, '.reticle/flows');

let home: string | undefined;

afterEach(() => {
  if (home) rmSync(home, { recursive: true, force: true });
  home = undefined;
});

describe('Reticle project config', () => {
  it('is found by Reticle discovery from the repository root', () => {
    // Saved flows live under .reticle/flows/<projectId>/, so the flow folder names the projectId
    // the root config must declare. One flow folder is expected; more would need a decision.
    const projectIds = readdirSync(FLOWS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(projectIds).toHaveLength(1);
    const [projectId] = projectIds;

    // A fake Reticle home holding one live daemon entry for this project.
    home = mkdtempSync(join(tmpdir(), 'reticle-home-'));
    writeFileSync(
      join(home, 'daemon-4411.json'),
      JSON.stringify({ projectId, port: 4411, pid: process.pid })
    );

    expect(discoverDaemonUrl(ROOT, home, () => true)).toBe('ws://localhost:4411/reticle');
  });

  it('returns nothing for a daemon serving a different project (control)', () => {
    home = mkdtempSync(join(tmpdir(), 'reticle-home-'));
    writeFileSync(
      join(home, 'daemon-4412.json'),
      JSON.stringify({ projectId: 'some-other-project', port: 4412, pid: process.pid })
    );

    expect(discoverDaemonUrl(ROOT, home, () => true)).toBeUndefined();
  });

  it('has no second copy under config/', () => {
    expect(existsSync(join(ROOT, 'config/reticle.json'))).toBe(false);
  });
});
