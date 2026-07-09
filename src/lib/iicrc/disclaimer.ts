/**
 * Canonical CEC-not-certification disclaimer (single source of truth).
 *
 * Licence-critical: CARSI is accredited as an IICRC CEC (Continuing Education
 * Credit) provider — it is NOT accredited to deliver IICRC certification. Import
 * these strings rather than re-typing the disclaimer inline, so the approved
 * wording stays consistent and any revision propagates everywhere.
 *
 * Wording conforms to CLAUDE.md § "IICRC CEC terminology" and passes
 * scripts/check-iicrc-terminology.mjs. Do not hand-edit into a variant without
 * re-running `npm run check:iicrc-terminology`.
 */

/** One-line disclaimer for cards, footers, and metadata descriptions. */
export const IICRC_CEC_DISCLAIMER_SHORT =
  'IICRC CEC Accredited — continuing education credits, not IICRC certification.';

/** Full disclaimer block for course/industry pages and the site-wide legal section. */
export const IICRC_CEC_DISCLAIMER_LONG =
  'CARSI is an IICRC CEC Accredited provider. CARSI courses earn IICRC ' +
  'Continuing Education Credits (CECs) toward maintaining an existing IICRC ' +
  'certification — they are not IICRC certification. IICRC certification is ' +
  'obtained only through IICRC-approved schools and examinations.';
