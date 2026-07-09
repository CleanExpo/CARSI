/**
 * cecHours guardrail for the course-asset-kit engine (GP-488).
 *
 * Licence-critical (CLAUDE.md § "CEC hours require per-course IICRC approval"):
 * a NEW course MUST ship with an explicit `cecHours: 0` (the "not CEC-approved"
 * opt-out) until the founder confirms IICRC approval and flips it to the approved
 * hours. The engine refuses to scaffold a course whose catalogue entry has no
 * explicit cecHours, and warns loudly on the legacy `null` (duration-derived)
 * value so it is never treated as safe.
 */

export type CecGuardLevel = 'ok' | 'warn' | 'refuse';

export interface CecGuardResult {
  level: CecGuardLevel;
  message: string;
}

/**
 * @param cecHours the catalogue entry's `cecHours` — `undefined` when the key is
 *   absent, `null` for the legacy duration-derived fallback, else the founder-set
 *   number.
 */
export function checkCecHours(cecHours: number | null | undefined): CecGuardResult {
  if (cecHours === undefined) {
    return {
      level: 'refuse',
      message:
        'cecHours is ABSENT from the catalogue entry. Every course must set an explicit ' +
        'cecHours (0 until the founder confirms IICRC CEC approval). Refusing to run.',
    };
  }
  if (cecHours === null) {
    return {
      level: 'warn',
      message:
        'cecHours is null (legacy / duration-derived). This is NOT an approved CEC value — ' +
        'a new course should set cecHours: 0 explicitly. Proceeding, but treat CEC claims as unset.',
    };
  }
  if (typeof cecHours !== 'number' || Number.isNaN(cecHours) || cecHours < 0) {
    return {
      level: 'refuse',
      message: `cecHours is invalid (${String(cecHours)}). Must be 0 or a positive founder-set number.`,
    };
  }
  if (cecHours === 0) {
    return { level: 'ok', message: 'cecHours: 0 (explicit "not CEC-approved" — correct for a new course).' };
  }
  return { level: 'ok', message: `cecHours: ${cecHours} (founder-set, IICRC-approved value).` };
}
