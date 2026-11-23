/**
 * GP-759 (c): one Stripe idempotency id per seat-expansion PURCHASE, not per click.
 *
 * The id is kept until the server reports a KNOWN outcome for it (allow-list): success (2xx), or
 * `SEATS_ALREADY_ADDED` (Stripe recognised the id as an expansion already applied). Every other
 * result keeps it: a timeout, a network failure, a 5xx, a rate limit, Stripe still executing the
 * earlier attempt (`SEAT_ADD_IN_PROGRESS`), or a refusal before Stripe was called (an id Stripe
 * never saw is safe to reuse). So the buyer's own retry after an ambiguous result reuses the id
 * and Stripe cannot apply the expansion twice. A page reload starts a new purchase.
 */
export const SEATS_ALREADY_ADDED = 'SEATS_ALREADY_ADDED';
export const SEAT_ADD_IN_PROGRESS = 'SEAT_ADD_IN_PROGRESS';

export type SeatExpansionRequests = {
  /** The id to send with this attempt. */
  currentId(): string;
  /** Report the attempt's HTTP status and error code (status undefined when no response). */
  settle(status: number | undefined, errorCode?: string): void;
};

export function isKnownSeatExpansionOutcome(status: number | undefined, errorCode?: string): boolean {
  if (status === undefined) return false;
  if (status >= 200 && status < 300) return true;
  return status === 409 && errorCode === SEATS_ALREADY_ADDED;
}

export function createSeatExpansionRequests(
  newId: () => string = () => crypto.randomUUID(),
): SeatExpansionRequests {
  let pending: string | null = null;
  return {
    currentId() {
      if (!pending) pending = newId();
      return pending;
    },
    settle(status, errorCode) {
      if (isKnownSeatExpansionOutcome(status, errorCode)) pending = null;
    },
  };
}
