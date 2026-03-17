"""Phase D2: Compliance audit log table.

Revision ID: 021
Revises: 020
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS lms_audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            actor_id UUID REFERENCES lms_users(id) ON DELETE SET NULL,
            actor_email VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100),
            resource_id VARCHAR(255),
            details JSONB,
            ip_address VARCHAR(45),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_lms_audit_log_actor
        ON lms_audit_log(actor_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_lms_audit_log_action
        ON lms_audit_log(action)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_lms_audit_log_created
        ON lms_audit_log(created_at DESC)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS lms_audit_log")
