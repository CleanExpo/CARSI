/**
 * CCW/CARSI attendance foundation (unit A) — PURE ledger derivation.
 *
 * The append-only `CcwRoadshowCheckInEvent` ledger is the regulatory source of
 * truth; the `day1CheckedInAt`/`day2CheckedInAt` columns on `CcwRoadshowSignIn`
 * are a DERIVED CACHE. This function is the single, pure, side-effect-free rule
 * that turns a person's ordered ledger rows back into that cache.
 *
 * A correction is never an UPDATE/DELETE of history — it is a new `reversal`
 * row. So the cache is recomputed by replaying the ledger in time order per day:
 * a `checkin` marks the day present (remembering the start of the current
 * present-streak), a `reversal` clears it. Whatever the final state is after the
 * replay is the truth. This means checkin → reversal → checkin correctly ends
 * "present", and checkin → reversal correctly ends "absent", with NO row ever
 * mutated or removed.
 */

/** Minimal shape of a ledger row this derivation reads. */
export interface LedgerEventLike {
  dayIndex: number;
  /** 'checkin' | 'reversal' */
  action: string;
  createdAt: Date;
}

export interface DerivedDayColumns {
  day1CheckedInAt: Date | null;
  day2CheckedInAt: Date | null;
}

/** Replay one day's ledger rows in time order; return the surviving timestamp. */
function deriveForDay(events: LedgerEventLike[], day: 1 | 2): Date | null {
  const forDay = events
    .filter((e) => e.dayIndex === day)
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let present = false;
  let since: Date | null = null;
  for (const e of forDay) {
    if (e.action === 'checkin') {
      // Keep the start of the current present-streak: a re-tap doesn't move it,
      // but a check-in AFTER a reversal starts a fresh streak from that row.
      present = true;
      if (since == null) since = e.createdAt;
    } else if (e.action === 'reversal') {
      present = false;
      since = null;
    }
  }
  return present ? since : null;
}

export function deriveDayColumns(events: LedgerEventLike[]): DerivedDayColumns {
  return {
    day1CheckedInAt: deriveForDay(events, 1),
    day2CheckedInAt: deriveForDay(events, 2),
  };
}
