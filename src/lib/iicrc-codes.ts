/**
 * IICRC certification and designation acronyms for the app, from data/iicrc-codes.json: the same
 * file the licence-guard scripts read (scripts/iicrc-codes.mjs). A runtime filter that decides
 * whether copy names an IICRC code uses this, never its own list (review of 08d15553).
 */
import data from '../../data/iicrc-codes.json';

type Entry = { code: string };

export const IICRC_CODES: readonly string[] = [
  ...data.certifications,
  ...data.designations,
  ...data.former,
].map((e: Entry) => e.code);

/** Regex alternation of every code (use inside \b(?:...)\b). */
export const IICRC_CODE_ALT = IICRC_CODES.join('|');
