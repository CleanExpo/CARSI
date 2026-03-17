"""Phase D1: Revenue tracking — UTM captures + subscription column additions.

Revision ID: 020
Revises: 019
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # lms_subscriptions already has stripe_customer_id and cancelled_at from
    # migration 003 — only add trial_ends_at which is new.
    op.execute("""
        ALTER TABLE lms_subscriptions
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS lms_utm_captures (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
            utm_source VARCHAR(100),
            utm_medium VARCHAR(100),
            utm_campaign VARCHAR(100),
            utm_content VARCHAR(100),
            utm_term VARCHAR(100),
            captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            page_path VARCHAR(500)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_lms_utm_captures_user
        ON lms_utm_captures(user_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_lms_utm_captures_source
        ON lms_utm_captures(utm_source)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS lms_utm_captures")
    op.execute("""
        ALTER TABLE lms_subscriptions DROP COLUMN IF EXISTS trial_ends_at
    """)
