/**
 * Holder-name resolution for issued credentials (#302).
 *
 * A certificate must name the person it certifies. We must NEVER fall back to
 * the email address (or its local-part) as the holder name:
 *  - a credential addressed to "support" or "support@carsi.com.au" is not a
 *    usable credential, and
 *  - emitting the email on the public verification page (credential-public.ts)
 *    would leak the holder's address.
 *
 * Root cause this guards: provisioning paths historically stored
 * `fullName = email.split('@')[0]`, poisoning the name. New accounts now store
 * a real name or null, and certificate issuance is gated on a real name being
 * present (see `canIssueCertificate`).
 */

/** Trimmed real name on file, or null when none — never the email. */
export function certificateHolderName(student: { fullName: string | null }): string | null {
  const name = student.fullName?.trim();
  return name ? name : null;
}

/** A completion/CEC certificate may be issued only when a real name is on file. */
export function canIssueCertificate(student: { fullName: string | null }): boolean {
  return certificateHolderName(student) !== null;
}

/**
 * Neutral display value for surfaces that render an ALREADY-issued certificate
 * (e.g. the public verify page) where issuance can no longer be gated. With
 * issuance gating this is unreachable for new data; it exists so no surface can
 * ever emit an email address as a name.
 */
export const CERTIFICATE_HOLDER_FALLBACK = 'CARSI Member';

/** Real name if present, otherwise the neutral fallback — never the email. */
export function certificateHolderDisplayName(student: { fullName: string | null }): string {
  return certificateHolderName(student) ?? CERTIFICATE_HOLDER_FALLBACK;
}
