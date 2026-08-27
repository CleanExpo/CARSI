-- Move the yearly-membership grant claim OFF the learner row and onto its own
-- table, keyed by email.
--
-- FORWARD migration, deliberately. `20260824223000_yearly_membership_grant_claim`
-- added `lms_users.yearly_membership_granted_at` and has already merged, so it may
-- have been applied. Editing or deleting an applied migration puts Prisma into
-- drift; the column is therefore dropped here rather than un-added there.
--
-- Why the column could not work. `grantYearlyMembership` CREATES the learner row
-- near the start of its work, before the enrolment loop and the mail send. A claim
-- living on that row could not be taken until the grant was already underway, so
-- the ordinary new-learner path — granting to someone with no account yet, which
-- is the normal use of the admin form — was unguarded across the slowest stretch,
-- exactly when an operator retries. Stamping after the grant narrowed that window
-- rather than closing it, and wrote unconditionally, so a slow grant could clobber
-- a newer claim.
--
-- A claim keyed by EMAIL does not depend on the learner existing, so it is taken
-- before the grant starts. Claimed by a conditional upsert, so the DATABASE
-- arbitrates:
--
--   INSERT INTO yearly_membership_grant_claims (email, claimed_at)
--   VALUES ($1, $2)
--   ON CONFLICT (email) DO UPDATE SET claimed_at = $2
--   WHERE yearly_membership_grant_claims.claimed_at < $3
--
-- One affected row means the claim was taken; zero means a grant for this email
-- landed inside the window and this one is refused.
--
-- A WINDOW, not a permanent lock: a yearly membership is renewed by design, so a
-- claim older than the window is overwritten rather than blocking forever.
--
-- No foreign key: a claim legitimately exists for an email with no account yet.
CREATE TABLE "yearly_membership_grant_claims" (
    "email" TEXT NOT NULL,
    "claimed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "yearly_membership_grant_claims_pkey" PRIMARY KEY ("email")
);

-- Only the superseded guard ever wrote this column, and that guard is removed in
-- the same change, so nothing reads it. IF EXISTS so the migration is safe on a
-- database where the preceding migration has not been applied.
ALTER TABLE "lms_users" DROP COLUMN IF EXISTS "yearly_membership_granted_at";
