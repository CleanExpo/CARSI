/**
 * GP-667 regression tests for scripts/premium-visuals/check-visuals.mjs.
 *
 * Each block plants one defect from GP-667 in a throwaway fixture repo, runs the real
 * scanner as a child process (stdout is a pipe, exactly as in CI), and asserts it is
 * caught. Each block also carries a positive control: the same fixture with the defect
 * removed must pass, so a scanner that fails everything cannot satisfy these tests.
 *
 * The scanner is a static heuristic. Passing it is never visual acceptance; the SDA
 * evidence gate and the owner's review of the rendered page remain mandatory.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../../..');
// CHECK_VISUALS_SCRIPT lets a mutation run point these tests at a deliberately broken copy.
const SCRIPT =
  process.env.CHECK_VISUALS_SCRIPT ?? path.join(REPO, 'scripts/premium-visuals/check-visuals.mjs');
const tmpRoots: string[] = [];

afterAll(() => {
  for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true });
});

type Files = Record<string, string | Buffer>;

function fixture(files: Files): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-fixture-'));
  tmpRoots.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return root;
}

interface Violation {
  rule: string;
  file: string;
  line: number;
  detail: string;
}
interface Summary {
  mode: string;
  total: number;
  marketingPagesChecked: number;
  marketingPages: string[];
  visualAcceptance: boolean;
  provenance: { rightsVerified: boolean };
  violations: Violation[];
}

function run(root: string, extra: string[] = []) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, ...extra], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function runJson(root: string, extra: string[] = []) {
  const r = run(root, ['--json', ...extra]);
  let json: Summary;
  try {
    json = JSON.parse(r.stdout) as Summary;
  } catch {
    throw new Error(
      `scanner stdout was not complete JSON (status ${r.status}, ${r.stdout.length} bytes): ${r.stderr}`
    );
  }
  return { ...r, json };
}

const rules = (s: Summary) => s.violations.map((v) => v.rule);
const ENFORCE = JSON.stringify({ mode: 'enforce', manifest: 'config/media.manifest.json' });
const REPORT = JSON.stringify({ mode: 'report', manifest: 'config/media.manifest.json' });
const MANIFEST_OK = JSON.stringify({
  version: 1,
  entries: [
    {
      src: '/media/hero.webp',
      kind: 'image',
      source: 'client',
      credit: 'CARSI client photo',
      alt: 'Technician drying a carpet',
    },
  ],
});
const GOOD_PAGE = `import { PremiumHero, MotionSection } from '@cleanexpo/premium-visuals';
export default function Page() {
  return (
    <main>
      <PremiumHero title="Real" media={{ src: '/media/hero.webp' }} />
      <MotionSection><p>Body</p></MotionSection>
    </main>
  );
}
`;
const BARE_PAGE = 'export default function Page() { return <main><h1>Plain</h1></main>; }\n';

/** A clean fixture: one compliant marketing page with real, manifested, present media. */
function cleanFiles(extra: Files = {}): Files {
  return {
    'config/visuals.config.json': ENFORCE,
    'config/media.manifest.json': MANIFEST_OK,
    'public/media/hero.webp': Buffer.alloc(10 * 1024),
    'app/page.tsx': GOOD_PAGE,
    ...extra,
  };
}

describe('positive control', () => {
  it('a compliant fixture passes enforce mode with zero findings', () => {
    const r = runJson(fixture(cleanFiles()));
    expect(r.json.violations).toEqual([]);
    expect(r.status).toBe(0);
    expect(r.json.marketingPagesChecked).toBe(1);
  });
});

describe('(1) JSON output is complete when piped', () => {
  it('emits valid JSON well past the pipe buffer, with the enforce exit status', () => {
    const files = cleanFiles();
    // ~1,500 findings -> several hundred kB of JSON, far beyond a 64 kB pipe buffer.
    for (let i = 0; i < 15; i++)
      files[`components/art${i}.tsx`] = '<svg viewBox="0 0 1 1"></svg>\n'.repeat(100);
    const r = runJson(fixture(files));
    expect(r.stdout.length).toBeGreaterThan(256 * 1024);
    expect(r.json.total).toBe(1500);
    expect(r.json.violations).toHaveLength(1500);
    expect(r.status).toBe(1);
  });

  it('report mode keeps the full JSON and exits 0', () => {
    const files = cleanFiles({ 'config/visuals.config.json': REPORT });
    for (let i = 0; i < 15; i++) files[`components/art${i}.tsx`] = '<svg></svg>\n'.repeat(100);
    const r = runJson(fixture(files));
    expect(r.json.total).toBe(1500);
    expect(r.status).toBe(0);
  });

  it('never ends with process.exit(), which drops buffered pipe output', () => {
    // Pipes are asynchronous on macOS, so process.exit() after a large write truncates it there.
    // A Linux runner may flush synchronously and hide the bug, so the source is guarded too.
    expect(fs.readFileSync(SCRIPT, 'utf8')).not.toMatch(/process\.exit\s*\(/);
  });
});

describe('(2) marketing-route coverage', () => {
  it('counts app/page.jsx and dynamic public routes such as app/courses/[slug]/page.tsx', () => {
    const files = cleanFiles({
      'app/page.jsx': BARE_PAGE,
      'app/courses/[slug]/page.tsx': BARE_PAGE,
      'app/(public)/about/page.js': BARE_PAGE,
    });
    delete files['app/page.tsx'];
    const r = runJson(fixture(files));
    expect(r.json.marketingPages.sort()).toEqual([
      'app/(public)/about/page.js',
      'app/courses/[slug]/page.tsx',
      'app/page.jsx',
    ]);
    expect(
      r.json.violations
        .filter((v) => v.rule === 'hero-missing-media')
        .map((v) => v.file)
        .sort()
    ).toEqual(r.json.marketingPages.sort());
    expect(r.status).toBe(1);
  });

  it('still excludes app-only routes (dashboard, admin, api, auth groups)', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'app/(dashboard)/dashboard/page.tsx': BARE_PAGE,
          'app/(admin)/admin/x/page.tsx': BARE_PAGE,
          'app/api/x/page.tsx': BARE_PAGE,
          'app/(auth)/login/page.tsx': BARE_PAGE,
        })
      )
    );
    expect(r.json.marketingPages).toEqual(['app/page.tsx']);
    expect(r.status).toBe(0);
  });

  it('fails closed when zero marketing pages are found but pages are expected', () => {
    const files = cleanFiles({ 'app/(dashboard)/dashboard/page.tsx': BARE_PAGE });
    delete files['app/page.tsx'];
    const r = runJson(fixture(files));
    expect(r.json.marketingPagesChecked).toBe(0);
    expect(rules(r.json)).toContain('marketing-coverage');
    expect(r.status).toBe(1);
  });

  it('a repo that declares minMarketingPages 0 may have none', () => {
    const files = cleanFiles({
      'config/visuals.config.json': JSON.stringify({ mode: 'enforce', minMarketingPages: 0 }),
    });
    delete files['app/page.tsx'];
    const r = runJson(fixture(files));
    expect(rules(r.json)).not.toContain('marketing-coverage');
  });

  it('**/app/ in a glob does not match a directory that merely ends in "app"', () => {
    const files = cleanFiles({ 'src/webapp/page.tsx': BARE_PAGE });
    const r = runJson(fixture(files));
    expect(r.json.marketingPages).toEqual(['app/page.tsx']);
  });
});

describe('(3) comments and unused strings are not rendered evidence', () => {
  const cases: Record<string, string> = {
    'line comment':
      'export default function Page() {\n  // <PremiumHero media={undefined} /> <MotionSection />\n  return <main />;\n}\n',
    'JSX comment':
      'export default function Page() {\n  return <main>{/* <PremiumHero media={x} /> <MotionSection> */}</main>;\n}\n',
    'unused string':
      "const note = '<PremiumHero media={x} /> <MotionSection> data-pv-motion';\nexport default function Page() { return <main />; }\n",
    'media={undefined}':
      'export default function Page() { return <main><PremiumHero title="x" media={undefined} /><MotionSection /></main>; }\n',
    'data-media attribute':
      'export default function Page() { return <main><PremiumHero title="x" data-media="hero" /><MotionSection /></main>; }\n',
    'media on a different element':
      'export default function Page() { return <main><PremiumHero title="x" /><MediaSection media={m} /><MotionSection /></main>; }\n',
  };
  for (const [name, page] of Object.entries(cases)) {
    it(`${name} does not satisfy the hero rule`, () => {
      const r = runJson(fixture(cleanFiles({ 'app/page.tsx': page })));
      expect(rules(r.json)).toContain('hero-missing-media');
      expect(r.status).toBe(1);
    });
  }

  it('a commented-out MotionSection does not satisfy the motion rule', () => {
    const page = GOOD_PAGE.replace(
      '<MotionSection><p>Body</p></MotionSection>',
      '{/* <MotionSection /> */}'
    );
    const r = runJson(fixture(cleanFiles({ 'app/page.tsx': page })));
    expect(rules(r.json)).toContain('no-motion');
  });
});

describe('(4) manifest provenance is validated', () => {
  const entry = {
    src: '/media/hero.webp',
    kind: 'image',
    source: 'client',
    credit: 'CARSI client photo',
    alt: 'Technician',
  };
  const withEntry = (e: unknown) =>
    cleanFiles({ 'config/media.manifest.json': JSON.stringify({ version: 1, entries: [e] }) });
  const bad: Record<string, Files> = {
    'missing src': withEntry({ ...entry, src: undefined }),
    'invalid kind': withEntry({ ...entry, kind: 'drawing' }),
    'missing kind': withEntry({ ...entry, kind: undefined }),
    'object credit': withEntry({ ...entry, credit: { name: 'x' } }),
    'object alt': withEntry({ ...entry, alt: { text: 'x' } }),
    'path traversal src': withEntry({ ...entry, src: '/../secret.webp' }),
    'non-object entry': withEntry('hero.webp'),
    'non-object manifest': cleanFiles({ 'config/media.manifest.json': '[]' }),
    'entries not an array': cleanFiles({
      'config/media.manifest.json': JSON.stringify({ version: 1, entries: {} }),
    }),
    'malformed JSON': cleanFiles({ 'config/media.manifest.json': '{ "version": 1, ' }),
    'video without poster': cleanFiles({
      'config/media.manifest.json': JSON.stringify({
        version: 1,
        entries: [entry, { ...entry, src: '/media/v.mp4', kind: 'video' }],
      }),
      'public/media/v.mp4': Buffer.alloc(1024),
    }),
  };
  for (const [name, files] of Object.entries(bad)) {
    it(`rejects ${name}`, () => {
      const r = runJson(fixture(files));
      expect(rules(r.json)).toContain('manifest-invalid');
      expect(r.status).toBe(1);
    });
  }

  it('names the shape error for an array or string manifest, not just a version mismatch', () => {
    for (const body of ['[]', '"media"', '[{"version":1,"entries":[]}]']) {
      const r = runJson(fixture(cleanFiles({ 'config/media.manifest.json': body })));
      const details = r.json.violations
        .filter((v) => v.rule === 'manifest-invalid')
        .map((v) => v.detail);
      expect(
        details.some((d) => /must be an object/.test(d)),
        body
      ).toBe(true);
    }
  });

  it('rejects a manifest entry whose file does not exist', () => {
    const files = cleanFiles();
    delete files['public/media/hero.webp'];
    const r = runJson(fixture(files));
    expect(rules(r.json)).toContain('manifest-missing-file');
    expect(r.status).toBe(1);
  });

  it('rejects an unmanifested image sitting in public/ even if no page references it', () => {
    const r = runJson(fixture(cleanFiles({ 'public/media/stray.webp': Buffer.alloc(1024) })));
    expect(
      r.json.violations.filter((v) => v.rule === 'unmanifested-public-media').map((v) => v.file)
    ).toEqual(['public/media/stray.webp']);
    expect(r.status).toBe(1);
  });

  it('reports credits as declarations, never as verified rights', () => {
    const r = runJson(fixture(cleanFiles()));
    expect(r.json.provenance.rightsVerified).toBe(false);
  });
});

describe('(5) allowlist and comment false positives', () => {
  const allowLogo = JSON.stringify({ mode: 'enforce', allowlist: ['**/*logo*'] });

  it('an allowlisted 500 kB catalogue-logo.webp still fails the image budget', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'config/visuals.config.json': allowLogo,
          'public/catalogue-logo.webp': Buffer.alloc(500 * 1024),
        })
      )
    );
    expect(r.json.violations.filter((v) => v.rule === 'media-budget').map((v) => v.file)).toEqual([
      'public/catalogue-logo.webp',
    ]);
    expect(r.status).toBe(1);
  });

  it('a 200 kB catalogue-logo.png is not exempted from the PNG budget by the "og" inside "logo"', () => {
    const r = runJson(
      fixture(cleanFiles({ 'public/catalogue-logo.png': Buffer.alloc(200 * 1024) }))
    );
    expect(rules(r.json)).toContain('media-budget');
  });

  it('an allowlisted component still gets placeholder-host checks', () => {
    const cfg = JSON.stringify({ mode: 'enforce', allowlist: ['**/components/ui/**'] });
    const r = runJson(
      fixture(
        cleanFiles({
          'config/visuals.config.json': cfg,
          'components/ui/card.tsx':
            'export const C = () => <img src="https://picsum.photos/200" />;\n',
        })
      )
    );
    expect(rules(r.json)).toContain('placeholder-host');
  });

  it('an allowlisted component is exempt from the code-drawn-art rules it was listed for', () => {
    const cfg = JSON.stringify({ mode: 'enforce', allowlist: ['**/components/ui/**'] });
    const r = runJson(
      fixture(
        cleanFiles({
          'config/visuals.config.json': cfg,
          'components/ui/check.tsx': 'export const C = () => <svg viewBox="0 0 1 1" />;\n',
        })
      )
    );
    expect(r.json.violations).toEqual([]);
  });

  it('SVG and gradients inside comments do not create findings', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'components/a.tsx':
            '// old: <svg viewBox="0 0 1 1"></svg>\n/* background: radial-gradient(red, blue); */\nexport const A = () => null;\n',
          'app/globals.css':
            '/* conic-gradient(red, blue) was removed */\nbody { color: black; }\n',
          'components/b.html': '<!-- <svg></svg> <canvas></canvas> -->\n<p>ok</p>\n',
        })
      )
    );
    expect(r.json.violations).toEqual([]);
  });

  it('real SVG, gradients and canvas in code are still caught (mutation control)', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'components/a.tsx':
            'export const A = () => <div style={{ background: "radial-gradient(red, blue)" }}><svg viewBox="0 0 1 1" /><canvas /></div>;\n',
          'app/globals.css': 'body { background: conic-gradient(red, blue); }\n',
        })
      )
    );
    expect(rules(r.json).sort()).toEqual([
      'canvas-drawing',
      'css-art',
      'css-art',
      'inline-svg-art',
    ]);
  });

  it('a // inside JSX text does not hide a real svg or placeholder host on the same line', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'components/a.tsx':
            'export const A = () => <p>See // <svg /><img src="https://picsum.photos/200" /></p>;\n',
        })
      )
    );
    expect(rules(r.json).sort()).toEqual(['inline-svg-art', 'placeholder-host']);
  });

  it('a URL in JSX text is not mistaken for a comment that hides real art', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'components/a.tsx': 'export const A = () => <p>See https://carsi.com.au <svg /></p>;\n',
        })
      )
    );
    expect(rules(r.json)).toContain('inline-svg-art');
  });
});

describe('(6) mode labelling, config, workflow and docs', () => {
  it('report-only mode is labelled as not visual acceptance, in text and JSON', () => {
    const root = fixture(
      cleanFiles({ 'config/visuals.config.json': REPORT, 'components/a.tsx': '<svg />\n' })
    );
    const text = run(root);
    expect(text.status).toBe(0);
    expect(text.stdout).toMatch(/REPORT-ONLY/);
    expect(text.stdout).toMatch(/not visual acceptance/i);
    const j = runJson(root);
    expect(j.json.mode).toBe('report-only');
    expect(j.json.visualAcceptance).toBe(false);
  });

  it('enforce mode with zero findings is still not visual acceptance', () => {
    const r = runJson(fixture(cleanFiles()));
    expect(r.status).toBe(0);
    expect(r.json.visualAcceptance).toBe(false);
  });

  it('an unknown mode or malformed config is a configuration error (exit 2), not a pass', () => {
    expect(
      run(
        fixture(cleanFiles({ 'config/visuals.config.json': JSON.stringify({ mode: 'enforced' }) }))
      ).status
    ).toBe(2);
    expect(run(fixture(cleanFiles({ 'config/visuals.config.json': '{ "mode": ' }))).status).toBe(2);
    expect(
      run(
        fixture(
          cleanFiles({
            'config/visuals.config.json': JSON.stringify({ mode: 'enforce', allowlist: '**' }),
          })
        )
      ).status
    ).toBe(2);
  });

  it('the workflow path filter covers every extension the scanner reads', () => {
    const exts = JSON.parse(
      spawnSync(process.execPath, [SCRIPT, '--list-extensions'], { encoding: 'utf8' }).stdout
    ) as { code: string[]; style: string[] };
    const wf = fs.readFileSync(path.join(REPO, '.github/workflows/check-visuals.yml'), 'utf8');
    const missing = [...exts.code, ...exts.style].filter((e) => !wf.includes(`"**/*.${e}"`));
    expect(exts.code.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
    expect(wf).toContain('"**/public/**"');
    expect(wf).toContain('"config/visuals.config.json"');
    expect(wf).toContain('"config/media.manifest.json"');
  });

  it('repo docs do not claim CI enforcement while visuals.config.json is report-only', () => {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(REPO, 'config/visuals.config.json'), 'utf8')
    ) as {
      mode: string;
    };
    for (const doc of ['docs/agents/AGENTS.md', 'docs/agents/CLAUDE.md']) {
        expect(t, doc).not.toMatch(/It is enforced in CI/);
        expect(t, doc).toMatch(/report-only/);
      }
      expect(t, doc).toMatch(/not visual acceptance/i);
    }
  });

  it('the docs point at the scaffold that exists, and the scaffold states its real install state', () => {
    const tpl = 'scripts/premium-visuals/marketing-page.template.tsx.txt';
    expect(fs.existsSync(path.join(REPO, tpl))).toBe(true);
    for (const doc of ['AGENTS.md', 'CLAUDE.md'])
      expect(fs.readFileSync(path.join(REPO, doc), 'utf8'), doc).toContain(tpl);
    for (const doc of ['docs/agents/AGENTS.md', 'docs/agents/CLAUDE.md'])
      string,
      Record<string, string> | undefined
    >;
    const installed = Boolean(
      pkg.dependencies?.['@cleanexpo/premium-visuals'] ??
      pkg.devDependencies?.['@cleanexpo/premium-visuals']
    );
    const body = fs.readFileSync(path.join(REPO, tpl), 'utf8');
    if (!installed) expect(body).toMatch(/NOT INSTALLED/);
    // "@/" maps to ./src in this repo, and media.manifest.json lives at the repo root.
    expect(body).not.toContain("'@/media.manifest.json'");
  });
});
