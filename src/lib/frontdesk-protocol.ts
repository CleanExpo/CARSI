/**
 * Shared front-desk streaming protocol — safe to import from both server and
 * client (no server-only dependencies).
 *
 * A confirm-gated write proposal is appended to the text stream as a trailer:
 *   \n<ACTION_TRAILER_PREFIX><json>\n
 * The trailer begins with U+001F (unit separator), a control char that cannot
 * occur in model prose, so the client splits message text from the proposal on
 * ACTION_SENTINEL and the server strips it before persisting the turn.
 */

/** U+001F unit separator — the split point; never appears in model prose. */
export const ACTION_SENTINEL = String.fromCharCode(31);

/** Full trailer prefix that precedes the proposal JSON. */
export const ACTION_TRAILER_PREFIX = `${ACTION_SENTINEL}FRONTDESK_ACTION `;

/** The JSON payload carried after the trailer prefix. */
export interface ActionProposalFrame {
  tool: string;
  summary: string;
  token: string;
  expiresAt: number;
}
