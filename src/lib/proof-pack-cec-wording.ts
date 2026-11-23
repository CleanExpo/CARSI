/**
 * The proof-pack's CEC lines (GP-748, GP-704). Shared by the PDF (server) and the public
 * training-record page (client), so the file imports only the approved wording.
 *
 * Use these only when the payload carries CEC fields, which it does only for courses listed in
 * data/seed/cec-approvals.json. A learner with no approved course sees none of them.
 */
import { APPROVED_FOR_IICRC_CECS_LABEL } from '@/lib/iicrc/approved-wording';

/** "Approved for IICRC CECs: 2 hours" — the hours from approved courses only. */
export function approvedCecHoursLine(hours: number): string {
  return `${APPROVED_FOR_IICRC_CECS_LABEL}: ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/** Heading over the per-discipline breakdown of approved hours. */
export const APPROVED_CEC_BY_DISCIPLINE_HEADING = `${APPROVED_FOR_IICRC_CECS_LABEL}, by discipline`;
