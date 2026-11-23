import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-759: the seat step reruns after a unique-key clash. The webhook and the success page fulfil
 * the same paid session at once; inside a transaction the loser's insert hits the
 * (studentId, courseId) unique key and Postgres aborts the transaction. Outside a transaction the
 * shared writer answered 'already_enrolled'; inside the step the rerun must give the same answer,
 * not a 500 to a paying buyer.
 */

const h = vi.hoisted(() => ({ runs: 0 }));
vi.mock('@/lib/server/db-tx', () => ({
  runSerializable: (fn: (tx: unknown) => Promise<unknown>) => {
    h.runs += 1;
    return fn({});
  },
}));

const { runSeatStateStep } = await import('./seat-state');

const clash = () => Object.assign(new Error('Unique constraint failed on the fields: (`student_id`,`course_id`)'), { code: 'P2002' });

beforeEach(() => {
  h.runs = 0;
});

describe('GP-759: seat step and unique-key clashes', () => {
  it('reruns the step after a unique clash, so the rerun can read the committed row', async () => {
    let first = true;
    const result = await runSeatStateStep(async () => {
      if (first) {
        first = false;
        throw clash();
      }
      return 'already_enrolled';
    });
    expect(result).toBe('already_enrolled');
    expect(h.runs).toBe(2);
  });

  it('control: a clash that keeps happening is not retried for ever', async () => {
    await expect(runSeatStateStep(async () => { throw clash(); })).rejects.toThrow('Unique constraint');
    expect(h.runs).toBe(3);
  });

  it('control: other errors are not rerun', async () => {
    await expect(runSeatStateStep(async () => { throw new Error('COURSE_SEATS_FULL'); })).rejects.toThrow('COURSE_SEATS_FULL');
    expect(h.runs).toBe(1);
  });
});
