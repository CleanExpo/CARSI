/**
 * Finalized, legal-review-ready disclaimer for the CARSI assistant.
 *
 * Single source of truth shared by the server system prompt and the client UI so
 * the wording legal signs off on is the wording that actually renders everywhere.
 * See docs/specs/2026-07-01-carsi-assistant-and-contact-reply.md §14a.2.
 *
 * Framework-neutral (no server/client-only deps) so both the API route and the
 * 'use client' FloatingChat component can import it.
 */
export const ASSISTANT_DISCLAIMER =
  "This is CARSI's assistant — best-researched guidance, not authoritative or legal advice. Always cross-reference the current official IICRC/RIA standard before you rely on it.";
