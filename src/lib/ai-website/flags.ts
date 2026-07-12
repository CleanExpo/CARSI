/**
 * AI Website feature flag. Dark-by-default: the route + APIs return 404 until this is enabled,
 * so merging/deploying the code is inert until the founder switches it on. See docs/ai-website/RUNBOOK.md.
 */
export function aiWebsiteEnabled(): boolean {
  return process.env.AI_WEBSITE_ENABLED === 'true' || process.env.AI_WEBSITE_ENABLED === '1';
}
