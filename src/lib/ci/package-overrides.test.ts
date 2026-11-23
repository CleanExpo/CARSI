/**
 * GP-720 / GP-726: an npm override for a package that is also a direct dependency must be
 * the reference form "$name", never a literal version.
 *
 * package.json pinned the react and react-dom overrides to "19.2.4". When Dependabot bumped
 * the direct dependency to ^19.3.1 it left the override alone, and npm refused with
 * EOVERRIDE ("Override for react@^19.3.1 conflicts with direct dependency"), so every
 * grouped npm update on main failed. "$react" always follows the direct spec. Overrides for
 * transitive-only packages (security pins) are not affected and may stay literal.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type Overrides = Record<string, unknown>;
interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  overrides?: Overrides;
}

const PACKAGE_JSON = fileURLToPath(new URL('../../../package.json', import.meta.url));

/** Overrides for direct dependencies that are not the "$name" reference. */
function literalDirectOverrides(pkg: PackageJson): string[] {
  const direct = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);
  const problems: string[] = [];
  for (const [name, value] of Object.entries(pkg.overrides ?? {})) {
    if (!direct.has(name)) continue;
    // npm also accepts an object form, where "." is the override for the package itself.
    const spec = typeof value === 'object' && value !== null ? (value as Overrides)['.'] : value;
    if (spec === undefined) continue;
    if (spec !== `$${name}`) {
      problems.push(`${name}: override is ${JSON.stringify(spec)}, expected "$${name}"`);
    }
  }
  return problems;
}

describe('package.json overrides for direct dependencies (GP-720)', () => {
  it('flags the literal react pin that broke Dependabot, and accepts the reference form', () => {
    const deps = { react: '19.2.4', 'react-dom': '19.2.4' };
    expect(
      literalDirectOverrides({
        dependencies: deps,
        overrides: { react: '19.2.4', 'react-dom': '19.2.4' },
      })
    ).toEqual([
      'react: override is "19.2.4", expected "$react"',
      'react-dom: override is "19.2.4", expected "$react-dom"',
    ]);
    expect(
      literalDirectOverrides({
        dependencies: deps,
        overrides: { react: '$react', 'react-dom': '$react-dom' },
      })
    ).toEqual([]);
    // Object form: the "." entry is what must be the reference.
    expect(
      literalDirectOverrides({
        devDependencies: { eslint: '9.0.0' },
        overrides: { eslint: { '.': '9.0.0' } },
      })
    ).toHaveLength(1);
    expect(
      literalDirectOverrides({
        devDependencies: { eslint: '9.0.0' },
        overrides: { eslint: { '.': '$eslint' } },
      })
    ).toEqual([]);
    // Transitive-only security pins stay literal.
    expect(
      literalDirectOverrides({ dependencies: deps, overrides: { 'shell-quote': '1.8.4' } })
    ).toEqual([]);
  });

  it('the real package.json has no literal override for a direct dependency', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as PackageJson;
    expect(Object.keys(pkg.overrides ?? {}).length).toBeGreaterThan(0);
    expect(literalDirectOverrides(pkg)).toEqual([]);
  });
});
