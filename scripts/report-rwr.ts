/**
 * npm run report:rwr [-- --json]
 *
 * Recurring weekly revenue from Stripe (GOAL.md). Run by Phill with STRIPE_SECRET_KEY set in his
 * own shell. Exits 2 and prints no figure when Stripe cannot be read. Logic and tests live in
 * src/lib/metrics/ (rwr.ts, rwr-stripe.ts, rwr-report.ts).
 */
import { getStripeClient } from '@/lib/api/stripe';
import { runRwrReport } from '@/lib/metrics/rwr-report';

runRwrReport({
  env: process.env,
  json: process.argv.includes('--json'),
  createStripe: () => getStripeClient(),
  out: (line) => console.log(line),
  err: (line) => console.error(line),
})
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    // Stable text only: an error message could carry an amount, and exit 2 never prints one.
    const kind = error instanceof Error ? error.name.replace(/[^A-Za-z]/g, '') : 'Error';
    console.error(`RWR not reported: the report crashed (${kind}).`);
    process.exitCode = 2;
  });
