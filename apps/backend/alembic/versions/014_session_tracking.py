"""
014 — Student session + lesson view tracking

Revision ID: 014
Revises: 013
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PGUUID

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Login/logout session events
    op.create_table(
        "lms_user_sessions",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", PGUUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_start", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("session_end", sa.DateTime(timezone=True)),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text),
    )
    op.create_index("ix_lms_user_sessions_student_id", "lms_user_sessions", ["student_id"])
    op.create_index("ix_lms_user_sessions_session_start", "lms_user_sessions", ["session_start"])

    # Lesson view events (not just completions)
    op.create_table(
        "lms_lesson_views",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", PGUUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", PGUUID(as_uuid=True), sa.ForeignKey("lms_lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", PGUUID(as_uuid=True), sa.ForeignKey("lms_courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("duration_seconds", sa.Integer, server_default="0"),
    )
    op.create_index("ix_lms_lesson_views_student_id", "lms_lesson_views", ["student_id"])
    op.create_index("ix_lms_lesson_views_course_id", "lms_lesson_views", ["course_id"])

def downgrade() -> None:
    op.drop_table("lms_lesson_views")
    op.drop_table("lms_user_sessions")
