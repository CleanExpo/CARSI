/**
 * Estate witness emission for captured leads.
 *
 * When WITNESS_URL + WITNESS_SECRET are set, a captured lead is reported
 * (HMAC-signed) to the Unite-Group CRM witness receiver (`/api/webhooks/front-desk`),
 * so the command centre witnesses lead activity across the estate. Dark by
 * default (either unset ⇒ no-op) and best-effort (never throws, never blocks the
 * lead capture).
 *
 * This mirrors `@cleanexpo/front-desk`'s `postWitnessEvent` / `withWitness`
 * verbatim (HMAC-SHA256, base64url, headers, event shape). It's inlined only
 * because CARSI does not yet consume the private package — swap this for
 * `import { postWitnessEvent } from '@cleanexpo/front-desk'` once CARSI adopts it
 * (needs a read:packages token on the DigitalOcean build).
 */

import crypto from 'node:crypto';

const BRAND = 'carsi';

export interface WitnessEmitInput {
  /** The lead's ticket reference. */
  reference: string;
  /** The prospect's email (stripped from the stored payload by the receiver). */
  email: string;
}

/** POST a signed `lead.captured` witness event. No-op unless configured. Never throws. */
export async function emitFrontDeskWitness(
  input: WitnessEmitInput,
  now: () => string = () => new Date().toISOString(),
): Promise<void> {
  const endpoint = process.env.WITNESS_URL?.trim();
  const secret = process.env.WITNESS_SECRET?.trim();
  if (!endpoint || !secret || secret.length < 16) return; // dark by default

  const body = JSON.stringify({
    type: 'lead.captured',
    brand: BRAND,
    reference: input.reference,
    occurredAt: now(),
    data: { email: input.email },
  });
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Signature': signature,
        'X-Nexus-Brand': BRAND,
        'X-Nexus-Event': 'lead.captured',
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.warn('[frontdesk/witness] emit failed:', e instanceof Error ? e.message : e);
  }
}
