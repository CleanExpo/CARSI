/**
 * AI Front Desk Phase 2 (write tools) ships DARK and fail-closed.
 *
 * Write tools (confirm-gated actions like capture_enquiry) are offered only when
 * BOTH the env flag is on AND an action-signing secret is configured — with no
 * secret, no valid confirm token can ever be minted, so the feature stays off.
 *
 * Default = off. Rollback = flag off (no data migration). Independent of
 * MARGOT_STREAMING, but write tools only reach the model on the streaming path.
 */

import { actionSecretConfigured } from './frontdesk/action-token';

function envTrue(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** True when confirm-gated write tools may be offered to the model. */
export function margotWriteToolsEnabled(): boolean {
  return envTrue(process.env.MARGOT_WRITE_TOOLS) && actionSecretConfigured();
}
