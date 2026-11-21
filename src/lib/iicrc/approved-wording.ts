/**
 * The one owner of CARSI's IICRC provider wording (GP-704).
 *
 * The IICRC's own term for CARSI's standing is "IICRC Approved CEC Provider". A single class the
 * IICRC has approved is "approved for IICRC CECs", and that phrase is used only for a class listed
 * in data/seed/cec-approvals.json. The retired provider phrase is never used again; the guard
 * src/lib/iicrc/approved-provider-wording.test.tsx fails the build if it comes back.
 *
 * Import these constants. Do not retype the phrases: a retyped copy is how the retired wording
 * survived on more than forty surfaces. This file has no imports so client components, edge
 * images (OpenGraph) and email templates can all use it.
 */

/** CARSI's provider standing, in the IICRC's own words. */
export const IICRC_APPROVED_CEC_PROVIDER = 'IICRC Approved CEC Provider';

/** The full provider sentence. */
export const CARSI_PROVIDER_STATUS = `CARSI is an ${IICRC_APPROVED_CEC_PROVIDER}.`;

/** For taglines: "Restoration training from an IICRC Approved CEC Provider". */
export const FROM_IICRC_APPROVED_CEC_PROVIDER = `from an ${IICRC_APPROVED_CEC_PROVIDER}`;

/** For one class listed in data/seed/cec-approvals.json only. */
export const APPROVED_FOR_IICRC_CECS = 'approved for IICRC CECs';

/** Sentence-start form of APPROVED_FOR_IICRC_CECS, for badges and headings over approved classes. */
export const APPROVED_FOR_IICRC_CECS_LABEL = 'Approved for IICRC CECs';
