/**
 * ONE IICRC code list (review of 08d15553). data/iicrc-codes.json is the only place the codes are
 * written down; scripts read it through scripts/iicrc-codes.mjs and the app through
 * src/lib/iicrc-codes.ts. A literal copy elsewhere goes stale: src/lib/iicrc-discipline-display.ts
 * kept one, and its runtime filter publicPathwayTarget() would have rendered a code added only to
 * the shared list.
 *
 * Structural rule: no array or regex-alternation literal in src/, app/ or scripts/ (tests and the
 * data file excepted) may hold 4 or more IICRC codes, unless every code in it is one of CARSI's
 * seven taught subject codes (CARSI_SUBJECT_CODES, the keys of the topic-label map). Those are
 * CARSI subject data (a page's recommended disciplines, certificate art), not a copy of the IICRC
 * list; any wider list, such as the old 36-code literal, fails.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import data from '../../data/iicrc-codes.json';
import { CARSI_SUBJECT_CODES, publicPathwayTarget } from './iicrc-discipline-display';
import { IICRC_CODES } from './iicrc-codes';

const ROOT = process.cwd();
const C = IICRC_CODES.join('|');
const ALT = new RegExp(`\\b(?:${C})(?:\\|(?:${C})){3,}\\b`, 'gi');
const Q = `['"\`](?:${C})['"\`]`;
const ARR = new RegExp(`\\[\\s*(?:${Q}\\s*,\\s*){3,}${Q}`, 'gi');
const SUBJECTS = new Set(CARSI_SUBJECT_CODES);

/** Literal lists of 4+ IICRC codes that reach beyond CARSI's subject codes. */
export function codeListLiterals(text: string): string[] {
  const out: string[] = [];
  for (const re of [ALT, ARR])
    for (const m of text.matchAll(re)) {
      const codes = m[0].toUpperCase().match(new RegExp(`\\b(?:${C})\\b`, 'g')) ?? [];
      if (codes.some((c) => !SUBJECTS.has(c))) out.push(m[0].slice(0, 80));
    }
  return out;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'generated') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(m?[jt]sx?|cjs)$/.test(name) && !/\.test\.|\.spec\.|__tests__/.test(full))
      out.push(full);
  }
  return out;
}

describe('one IICRC code list', () => {
  it('the data file carries sources, read and last-verified dates', () => {
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.read).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(IICRC_CODES).toEqual(expect.arrayContaining(['WRT', 'RRT', 'CCMT', 'MWR']));
  });

  it('control: the old literal in iicrc-discipline-display.ts is a code list', () => {
    const old =
      "export const ALL_IICRC_CODES =\n  'WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|CPT|FCT|HCT|HST|LCT|RCT|SMT|TCST|UFT|RFMT|WFMT|BMI|BMT|BCI|CDS|MRS|ISSI|RFI|WFI|WLFI|SCI|MWR|MTC|MSR|JWR|JTC|JSR';";
    expect(codeListLiterals(old)).toHaveLength(1);
    expect(
      codeListLiterals(
        "const BANNED = ['WRT', 'ASD', 'AMRT', 'FSRT', 'CCT', 'TCST', 'OCT', 'RRT'];"
      )
    ).toHaveLength(1);
    expect(codeListLiterals("disciplines={['AMRT', 'WRT', 'CRT', 'ASD']}")).toEqual([]);
  });

  it('no source file outside the data file holds its own IICRC code list', () => {
    const found = ['src', 'app', 'scripts'].flatMap((d) =>
      sourceFiles(join(ROOT, d)).flatMap((f) =>
        codeListLiterals(readFileSync(f, 'utf8')).map((l) => `${relative(ROOT, f)}: ${l}`)
      )
    );
    expect(found).toEqual([]);
  });
});

describe('publicPathwayTarget reads the shared list', () => {
  it('suppresses a target naming a code from the shared list (RRT)', () => {
    expect(publicPathwayTarget('Work toward RRT')).toBeNull();
  });

  it.each(IICRC_CODES.map((c) => [c]))('suppresses a target naming %s', (code) => {
    expect(publicPathwayTarget(`Carpet care pathway to ${code}`)).toBeNull();
  });

  it('keeps a target that names no code or certification', () => {
    expect(publicPathwayTarget('Lead water restoration practitioner')).toBe(
      'Lead water restoration practitioner'
    );
  });
});
