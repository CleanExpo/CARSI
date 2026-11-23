/**
 * GP-561 Round 2 — engineering defaults until founder rewrites copy.
 * CARSI is the member system of record; Mission Control stays sales/CRM.
 */
export const COACHING_RECORDS_DEFAULT = {
  systemOfRecord:
    'Coaching plans, actions, sessions, onboarding snapshots, and AI briefs live in CARSI (Postgres + portal). Mission Control is for sales follow-up only — not a duplicate plan store.',
  memberFacingSummary:
    'Your plan and session receipts are always in your Business Coaching portal. Phill’s team may log sales notes elsewhere, but your working copy is here.',
} as const;

export const COACHING_OFFER_CADENCE_DEFAULT = {
  monthlySessionMinimum: 'At least one live monthly planning session with your coach.',
  asyncChannel: 'Ask my coach between sessions — corpus-grounded or escalated to your coach.',
  planRefresh: 'Growth plan and monthly actions update after each session receipt.',
} as const;

export const COACHING_AI_CONSENT_COPY = {
  askCoachDisclaimer:
    'AI answers use only your coach’s published material plus what you type here. This is coaching support, not legal, financial, or technical compliance advice — your coach reviews escalated questions.',
  briefDisclaimer:
    'The onboarding brief is an AI draft for your coach. It does not replace their judgement or approval on your growth plan.',
} as const;
