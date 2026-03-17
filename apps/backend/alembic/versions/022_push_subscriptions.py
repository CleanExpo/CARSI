"""Phase D4: PWA push subscriptions table.

Revision ID: 022
Revises: 021
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS lms_push_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent VARCHAR(500),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(student_id, endpoint)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_lms_push_subscriptions_student
        ON lms_push_subscriptions(student_id)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS lms_push_subscriptions")
