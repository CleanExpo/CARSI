"""
011 — Performance Indexes

Add composite indexes on hot query paths identified in audit.
Revision ID: 011 / Revises: 010

Corrections from model audit (lms_models.py):
- lms_lesson_progress does not exist — actual table is lms_progress
- lms_cec_records does not exist — actual table is lms_cec_transactions
- lms_progress uses completed_at (DateTime), not is_completed (Boolean)
- lms_courses has no is_published column — status column only
"""
from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # lms_enrollments: most queries filter by student_id + status
    op.create_index("ix_lms_enrollments_student_status", "lms_enrollments", ["student_id", "status"])
    # lms_enrollments: instructor queries filter by course_id
    op.create_index("ix_lms_enrollments_course_id", "lms_enrollments", ["course_id"])

    # lms_progress: most queries filter by enrollment_id
    # (table is lms_progress, not lms_lesson_progress)
    op.create_index("ix_lms_progress_enrollment", "lms_progress", ["enrollment_id"])
    # lms_progress: completion queries filter by lesson_id + completed_at (not is_completed)
    op.create_index("ix_lms_progress_lesson_completed_at", "lms_progress", ["lesson_id", "completed_at"])

    # lms_quiz_attempts: filter by student_id + quiz_id
    op.create_index("ix_lms_quiz_attempts_student_quiz", "lms_quiz_attempts", ["student_id", "quiz_id"])

    # lms_courses: catalog queries filter by status (no is_published column on this table)
    op.create_index("ix_lms_courses_status", "lms_courses", ["status"])

    # lms_cec_transactions: filter by student_id for CEC ledger queries
    # (table is lms_cec_transactions, not lms_cec_records)
    op.create_index("ix_lms_cec_transactions_student", "lms_cec_transactions", ["student_id"])


def downgrade() -> None:
    op.drop_index("ix_lms_enrollments_student_status", "lms_enrollments")
    op.drop_index("ix_lms_enrollments_course_id", "lms_enrollments")
    op.drop_index("ix_lms_progress_enrollment", "lms_progress")
    op.drop_index("ix_lms_progress_lesson_completed_at", "lms_progress")
    op.drop_index("ix_lms_quiz_attempts_student_quiz", "lms_quiz_attempts")
    op.drop_index("ix_lms_courses_status", "lms_courses")
    op.drop_index("ix_lms_cec_transactions_student", "lms_cec_transactions")
