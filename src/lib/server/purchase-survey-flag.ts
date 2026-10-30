/**
 * Payment-success purchase survey (Authority Machine slice 1b) — feature flag.
 *
 * DARK by default. Only `PURCHASE_SURVEY_ENABLED=true` or `=1` turns it on. When off, the
 * survey API returns 404 and the payment-success page renders exactly as before.
 *
 * Read at request time (the payment-success page is rendered on demand). Server-only.
 */
export function isPurchaseSurveyEnabled(): boolean {
  const value = process.env.PURCHASE_SURVEY_ENABLED?.trim().toLowerCase();
  return value === 'true' || value === '1';
}
