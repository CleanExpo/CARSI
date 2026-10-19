/**
 * IICRC certification and designation acronyms for the scripts: read from data/iicrc-codes.json,
 * the ONE list the licence guards (check-iicrc-terminology, check-designations, licence-inventory,
 * the live catalogue checks) and the app (src/lib/iicrc-codes.ts) all use. Sources, read date and
 * last-verified date live in that file. Never copy codes into a literal list elsewhere:
 * src/lib/iicrc-code-lists.test.ts fails on one (reviews of f37d2116 and 08d15553).
 */
import { readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('../data/iicrc-codes.json', import.meta.url), 'utf8'));

const pairs = (group) => DATA[group].map((e) => [e.code, e.name]);

export const IICRC_CERTIFICATIONS = pairs('certifications');
export const IICRC_DESIGNATIONS = pairs('designations');
export const IICRC_FORMER_CODES = DATA.former.map((e) => e.code);

const ENTRIES = [...DATA.certifications, ...DATA.designations, ...DATA.former];

export const IICRC_CODES = ENTRIES.map((e) => e.code);

/** Regex alternation of every code (use inside \b(?:...)\b). */
export const IICRC_CODE_ALT = IICRC_CODES.join('|');

/** Codes that are also an ordinary word or abbreviation ("Oct", "BMI"): see the data file note. */
export const IICRC_ORDINARY_WORD_CODES = new Set(
  ENTRIES.filter((e) => e.ordinaryWord).map((e) => e.code)
);
