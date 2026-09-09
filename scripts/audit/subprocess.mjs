#!/usr/bin/env node
/**
 * GP-567 — the audit's only subprocess reader, fail-CLOSED.
 *
 * ── Why this module exists (round-10 review, P1) ──────────────────────────
 *
 * Every audit script that shelled out did it this way:
 *
 *     let out = '';
 *     try { out = execFileSync('git', [...], { encoding: 'utf8' }); }
 *     catch (e) { out = e.stdout || ''; }
 *
 * When git cannot run at all, `e.stdout` is empty, so `out` becomes `''` — a
 * value indistinguishable from a real, successful, empty measurement. c6's pass
 * condition is "the set of modified guards is EMPTY", so the two collapse into
 * the same verdict: independent review planted a real edit in
 * `scripts/check-cec-surfaces.mjs`, broke the git invocation, and watched c6
 * print `OK c6: ... no guard modified` and exit 0.
 *
 * The defect is not the missing check on the result. It is that a fallback value
 * existed for the catch to reach for. A failed measurement must not be able to
 * produce a value that any consumer can read as data — so this reader branches
 * on the exit status BEFORE stdout is touched, and throws rather than returning.
 *
 * This is the zero-blindness class in general form: a check whose pass condition
 * is an empty set cannot, on its own, tell "measured empty" from "failed to
 * measure". Reading the exit status is what separates them, and it is the only
 * thing that does — a non-empty-diff assertion would not, because c6 legitimately
 * sees an empty diff when run on main after a merge.
 *
 * `allowedExits` exists for exactly one documented case: `git grep` exits 1 to
 * mean "no matches", which is a real, successful, empty measurement. Every other
 * non-zero status, every signal death, every spawn failure (git absent, ENOBUFS
 * on an over-large read) fails closed.
 */
import { spawnSync } from 'node:child_process';

/** Thrown when a subprocess could not be run, or ran and did not succeed. */
export class SubprocessFailure extends Error {
  constructor(message) {
    super(message);
    this.name = 'SubprocessFailure';
  }
}

const DEFAULT_MAX_BUFFER = 32 * 1024 * 1024;

/**
 * Run a command and return its stdout, or throw SubprocessFailure.
 *
 * Never returns a partial or fallback value: if the process did not exit with an
 * allowed status, the caller gets an exception, not a string it might measure.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{cwd?: string, allowedExits?: number[], maxBuffer?: number}} [opts]
 * @returns {string} stdout
 */
export function run(cmd, args, opts = {}) {
  const { cwd, allowedExits = [0], maxBuffer = DEFAULT_MAX_BUFFER } = opts;
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer });

  // Spawn itself failed — binary absent, permission denied, output over maxBuffer.
  // There is no exit status to inspect and no stdout worth reading.
  if (r.error) {
    throw new SubprocessFailure(`${cmd} could not be run: ${r.error.message}`);
  }
  if (r.signal) {
    throw new SubprocessFailure(`${cmd} was killed by signal ${r.signal}`);
  }
  if (!allowedExits.includes(r.status)) {
    const why = (r.stderr || '').trim().split('\n')[0] || '(no stderr)';
    throw new SubprocessFailure(`${cmd} exited ${r.status}: ${why}`);
  }
  return r.stdout ?? '';
}

/**
 * Run a command whose NON-ZERO EXIT IS ITSELF THE DATUM — the repo guards, whose
 * pass/fail verdict the compliance sweep records.
 *
 * Still fails closed on a spawn failure or signal death, because those are not a
 * verdict: recording `exit 1` for a guard that never ran attributes a failure to
 * the guard instead of to the environment, and `e.status ?? 1` did exactly that.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{cwd?: string, maxBuffer?: number}} [opts]
 * @returns {{status: number, stdout: string, stderr: string}}
 */
export function runCapture(cmd, args, opts = {}) {
  const { cwd, maxBuffer = DEFAULT_MAX_BUFFER } = opts;
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer });

  if (r.error) {
    throw new SubprocessFailure(`${cmd} could not be run: ${r.error.message}`);
  }
  if (r.signal) {
    throw new SubprocessFailure(`${cmd} was killed by signal ${r.signal}`);
  }
  if (typeof r.status !== 'number') {
    throw new SubprocessFailure(`${cmd} produced no exit status`);
  }
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
