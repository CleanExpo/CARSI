"""
015 — In-app notifications

Revision ID: 015
Revises: 014
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PGUUID

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "lms_notifications",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", PGUUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),  # cert_issued | streak_reminder | course_nudge | cec_renewal | reengagement
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("action_url", sa.String(500)),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("read_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_lms_notifications_student_id", "lms_notifications", ["student_id"])
    op.create_index("ix_lms_notifications_is_read", "lms_notifications", ["student_id", "is_read"])

def downgrade() -> None:
    op.drop_table("lms_notifications")
