function hasPrismaCode(error, code) {
  return Boolean(error && typeof error === 'object' && error.code === code);
}

export async function claimStripeWebhookEvent(delegate, event) {
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
    if (hasPrismaCode(error, 'P2002')) {
      return { claimed: false };
    }
    throw error;
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
