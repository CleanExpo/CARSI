/**
 * GP-759 (c): one Stripe idempotency id per seat-expansion PURCHASE, not per click.
 *
 * The id is kept while the outcome of the last attempt is unknown (timeout, network failure,
 * 5xx, rate limit), so the buyer's own retry after a lost response reuses it and Stripe cannot
 * apply the expansion twice. It is dropped only on a known outcome: success, or a definite
 * refusal (any other 4xx, including the 409 the server returns when Stripe recognises the id).
 * The next purchase after a known outcome gets a fresh id.
 */
export type SeatExpansionRequests = {
  /** The id to send with this attempt. */
  currentId(): string;
  /** Report the attempt's HTTP status (undefined when no response arrived). */
  settle(status: number | undefined): void;
};

export function isKnownSeatExpansionOutcome(status: number | undefined): boolean {
  if (status === undefined) return false;
  if (status >= 200 && status < 300) return true;
  if (status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
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
    settle(status) {
      if (isKnownSeatExpansionOutcome(status)) pending = null;
    },
  };
}
