import { createHmac, timingSafeEqual } from "crypto";

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

export async function POST(request: NextRequest) {
  try {
    // Body size guard: reject oversized payloads before reading
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      logger.error("WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const sig = request.headers.get("x-webhook-signature") || "";
    const rawBody = await request.text();

    // Second size check for chunked requests without content-length
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(`sha256=${expected}`);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      logger.warn("Webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, data } = body;

    switch (event) {
      case 'task.completed':
        logger.info('Task completed', { data });
        break;
      case 'task.failed':
        logger.warn('Task failed', { data });
        break;
      case 'agent.status':
        logger.info('Agent status update', { data });
        break;
      default:
        logger.warn('Unknown webhook event', { event, data });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
