function hasPrismaCode(error, code) {
  return Boolean(error && typeof error === 'object' && error.code === code);
}

// A claim row whose processedAt is still null after this long is treated as a
// stale claim left by a crashed/killed invocation, and may be reclaimed so
// Stripe's at-least-once retry can finish the event instead of it being dropped
// as a permanent "duplicate". Downstream side effects are idempotent (fulfill
// dedupes on paymentReference; revoke is a no-op once already revoked), so the
// rare double-process from two near-simultaneous reclaims is safe.
export const STALE_CLAIM_MS = 2 * 60 * 1000;

export async function claimStripeWebhookEvent(delegate, event, now = new Date()) {
  if (!event?.id) {
    throw new Error('Stripe event id is required');
  }

  try {
    await delegate.create({
      data: {
        id: event.id,
        type: event.type,
      },
    });
    return { claimed: true };
  } catch (error) {
    if (!hasPrismaCode(error, 'P2002')) {
      throw error;
    }
    // Row already exists. Decide whether it is a genuine duplicate or a stale,
    // never-finished claim that should be reclaimed (processedAt-aware dedupe).
    const existing =
      typeof delegate.findUnique === 'function'
        ? await delegate.findUnique({ where: { id: event.id } })
        : null;
    if (!existing) return { claimed: false };
    if (existing.processedAt) return { claimed: false }; // genuinely processed
    const ageMs = now.getTime() - new Date(existing.createdAt).getTime();
    if (ageMs < STALE_CLAIM_MS) return { claimed: false }; // another worker in-flight
    return { claimed: true }; // stale unprocessed claim → allow reprocessing
  }
}

export async function markStripeWebhookEventProcessed(delegate, eventId, processedAt = new Date()) {
  await delegate.update({
    where: { id: eventId },
    data: { processedAt },
  });
}

export async function releaseStripeWebhookEventClaim(delegate, eventId) {
  try {
    await delegate.delete({ where: { id: eventId } });
  } catch (error) {
    if (!hasPrismaCode(error, 'P2025')) throw error;
  }
}
