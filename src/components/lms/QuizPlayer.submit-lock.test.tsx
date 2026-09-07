import { describe, expect, it, vi } from 'vitest';

import { runGuardedSubmit } from './QuizPlayer';

/**
 * Regression cover for a P1 raised by an independent reviewer on 2026-09-07.
 *
 * A quiz attempt is destructive and strictly limited: the schema allows 3, the API returns 409
 * once they are gone, there is no learner-visible reset, and a quiz lesson has no completion
 * path except passing. So both failure directions are expensive and this file tests both:
 *
 *   - lock never released  -> the student is stranded in the course permanently
 *   - lock never held      -> one double-click on a slow connection spends two of three attempts
 *
 * The original defect was the first. The submit lock released only inside `catch`, but the real
 * caller (`LearnCourseShell.submitQuiz`) catches its own API error, shows a message, and
 * RESOLVES — so nothing ever reached that `catch`.
 */

/** A promise whose settlement this test controls, so the in-flight window can be inspected. */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Mimics the useState pair the component passes in. */
function lock() {
  const state = { locked: false };
  return { state, setLocked: (v: boolean) => { state.locked = v; } };
}

describe('quiz submit lock', () => {
  it('positive control: a normal submit runs once and leaves the lock released', async () => {
    // Without this, a helper that refuses to do anything at all would satisfy every test below.
    const { state, setLocked } = lock();
    const submit = vi.fn(async () => {});
    await runGuardedSubmit(state.locked, setLocked, submit);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(state.locked).toBe(false);
  });

  it('THE BUG: releases the lock when the caller handles its own error and RESOLVES', async () => {
    // This is the exact shape of LearnCourseShell.submitQuiz: it swallows the ApiClientError,
    // calls setLessonError, and returns normally. A `catch`-only release stays locked here.
    const { state, setLocked } = lock();
    const submit = vi.fn(async () => {
      try {
        throw new Error('api failed');
      } catch {
        /* caller shows its own message and resolves, exactly like the real one */
      }
    });
    await runGuardedSubmit(state.locked, setLocked, submit);
    expect(state.locked).toBe(false);
  });

  it('releases the lock when the submit throws', async () => {
    const { state, setLocked } = lock();
    await expect(
      runGuardedSubmit(state.locked, setLocked, async () => {
        throw new Error('network');
      }),
    ).rejects.toThrow('network');
    expect(state.locked).toBe(false);
  });

  it('releases the lock when the caller returns undefined instead of a promise', async () => {
    // Guards the `void submitQuiz(a)` shape, which discards the promise.
    const { state, setLocked } = lock();
    await runGuardedSubmit(state.locked, setLocked, () => undefined);
    expect(state.locked).toBe(false);
  });

  it('HOLDS the lock for the whole in-flight window, not a token instant', async () => {
    // The other half of the defect class. If the caller discards the promise, the await
    // resolves immediately and the double-submit guard protects nothing.
    const { state, setLocked } = lock();
    const d = deferred();
    const run = runGuardedSubmit(state.locked, setLocked, () => d.promise);
    await Promise.resolve(); // let the lock be taken
    expect(state.locked).toBe(true); // still in flight
    d.resolve();
    await run;
    expect(state.locked).toBe(false);
  });

  it('refuses re-entry while locked, so a double-click cannot spend two attempts', async () => {
    const submit = vi.fn(async () => {});
    const setLocked = vi.fn();
    await runGuardedSubmit(true, setLocked, submit);
    expect(submit).not.toHaveBeenCalled();
    expect(setLocked).not.toHaveBeenCalled();
  });
});
