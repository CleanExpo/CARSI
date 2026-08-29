import { NextResponse } from 'next/server';

import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

// Deliberately a separate route from /api/health. That one is polled by
// DigitalOcean's health_check and restarts the instance on sustained failure,
// so it is not a safe place to add anything.
export const dynamic = 'force-dynamic';

/**
 * TEMPORARY DIAGNOSTIC — remove once the SUBSCRIPTIONS_ENABLED rollout is settled.
 *
 * Why this exists: the variable was set in DigitalOcean, the deploy went Active
 * on a fresh container, and the running app still evaluated the flag as false.
 * Four independent surfaces agreed it was false (both flag-gated checkout
 * routes, the /subscribe page, and /pricing's generateMetadata), and a local
 * production build of the same commit succeeded — so the code was not the
 * cause. Nothing outside the container could distinguish "the variable never
 * arrives" from "it arrives with a value the parser rejects".
 *
 * This reports that distinction and nothing else. It returns the LENGTH of the
 * raw value, never the value: enough to tell an empty string from `true` from a
 * literally-quoted `"true"`, while echoing no content. Whether the subscription
 * feature is on is already public at /subscribe, so this adds no disclosure.
 */
export async function GET(): Promise<NextResponse> {
  const raw = process.env.SUBSCRIPTIONS_ENABLED;

  return NextResponse.json({
    subscriptions_enabled: {
      // false => the variable is not reaching this container at all.
      present: raw !== undefined,
      // 0 with present:true => set to an empty string.
      // A length longer than the trimmed one => surrounding whitespace.
      // 6 where you expected 4 => quote characters were typed into the field.
      raw_length: typeof raw === 'string' ? raw.length : 0,
      trimmed_length: typeof raw === 'string' ? raw.trim().length : 0,
      // What subscriptions-flag.ts actually decides. Accepts only
      // true | 1 | yes | on, after trim + lowercase.
      parsed: subscriptionsEnabled(),
    },
  });
}
