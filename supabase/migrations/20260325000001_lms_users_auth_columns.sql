-- =============================================================================
-- Migration: Add auth columns to lms_users
-- Description: The FastAPI backend manages its own JWT auth with bcrypt hashes.
--              These columns are required by the LMSUser SQLAlchemy model.
-- =============================================================================

-- Drop the foreign key constraint to auth.users (backend uses standalone auth)
ALTER TABLE public.lms_users
    DROP CONSTRAINT IF EXISTS lms_users_id_fkey;

-- Add columns that the SQLAlchemy LMSUser model requires
ALTER TABLE public.lms_users
    ADD COLUMN IF NOT EXISTS hashed_password       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS recommended_pathway   VARCHAR(50),
    ADD COLUMN IF NOT EXISTS password_reset_token  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Index for password reset token lookups
CREATE INDEX IF NOT EXISTS lms_users_reset_token_idx
    ON public.lms_users (password_reset_token)
    WHERE password_reset_token IS NOT NULL;

-- Allow id to be generated independently (not tied to auth.users)
-- The id column stays UUID PRIMARY KEY, just no longer FK to auth.users
