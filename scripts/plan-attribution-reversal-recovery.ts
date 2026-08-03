#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

type RecoveryArgs = {
  input: string;
  output: string | null;
  authorisedBy: string;
  dryRun: true;
};

type StripeExportEvent = {
  id?: unknown;
  type?: unknown;
  created?: unknown;
  data?: { object?: Record<string, unknown> };
};

export type AttributionReversalRecoveryCandidate = {
  stripeEventId: string;
  type: string;
  paymentIntentId: string;
  reversedRevenueCents: number;
  currency: string;
  eventAt: string;
  reason: 'refunded' | 'disputed' | 'dispute_won';
  requiresCanonicalTransactionLookup: true;
};

function readOption(args: string[], name: string): string | null {
  const equals = args.find((arg) => arg.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1).trim() || null;
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1]?.trim() || null : null;
}

export function parseRecoveryArgs(args: string[]): RecoveryArgs {
  if (!args.includes('--dry-run')) {
    throw new Error('--dry-run is mandatory; this command never mutates Stripe or CARSI');
  }
  const input = readOption(args, '--input');
  if (!input) throw new Error('--input=<offline-stripe-events.json> is required');
  const authorisedBy = readOption(args, '--authorised-by');
  if (!authorisedBy) throw new Error('--authorised-by=<approval-reference> is required');
  return {
    input,
    output: readOption(args, '--output'),
    authorisedBy,
    dryRun: true,
  };
}

function stringId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }
  return null;
}

export function buildRecoveryPlan(
  events: StripeExportEvent[],
): AttributionReversalRecoveryCandidate[] {
  const candidates: AttributionReversalRecoveryCandidate[] = [];
  for (const event of events) {
    const object = event.data?.object;
    const stripeEventId = typeof event.id === 'string' ? event.id : null;
    const type = typeof event.type === 'string' ? event.type : null;
    const created = typeof event.created === 'number' ? event.created : null;
    const paymentIntentId = stringId(object?.payment_intent);
    const currency = typeof object?.currency === 'string' ? object.currency.toUpperCase() : null;
    if (!stripeEventId || !type || created == null || !paymentIntentId || !currency) continue;

    let reason: AttributionReversalRecoveryCandidate['reason'];
    let reversedRevenueCents: number;
    if (type === 'charge.refunded') {
      reason = 'refunded';
      reversedRevenueCents = Number(object?.amount_refunded);
    } else if (type === 'charge.dispute.created') {
      reason = 'disputed';
      reversedRevenueCents = Number(object?.amount);
    } else if (type === 'charge.dispute.closed' && object?.status === 'won') {
      reason = 'dispute_won';
      reversedRevenueCents = 0;
    } else {
      continue;
    }
    if (!Number.isSafeInteger(reversedRevenueCents) || reversedRevenueCents < 0) continue;

    candidates.push({
      stripeEventId,
      type,
      paymentIntentId,
      reversedRevenueCents,
      currency,
      eventAt: new Date(created * 1_000).toISOString(),
      reason,
      requiresCanonicalTransactionLookup: true,
    });
  }
  return candidates.sort((a, b) =>
    a.eventAt === b.eventAt
      ? a.stripeEventId.localeCompare(b.stripeEventId)
      : a.eventAt.localeCompare(b.eventAt),
  );
}

async function main(): Promise<void> {
  const args = parseRecoveryArgs(process.argv.slice(2));
  const raw = JSON.parse(await readFile(args.input, 'utf8')) as
    | StripeExportEvent[]
    | { data?: StripeExportEvent[] };
  const events = Array.isArray(raw) ? raw : raw.data;
  if (!Array.isArray(events)) throw new Error('Input must be a Stripe event array or {"data": [...]}');
  const report = {
    mode: 'dry-run' as const,
    authorisedBy: args.authorisedBy,
    generatedAt: new Date().toISOString(),
    candidates: buildRecoveryPlan(events),
    nextStep:
      'Human review must resolve each paymentIntentId to exactly one invoice or checkout-session transaction key before any separately approved recovery write.',
  };
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.output) await writeFile(args.output, output, { flag: 'wx' });
  else process.stdout.write(output);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}