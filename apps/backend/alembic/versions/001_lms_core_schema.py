"""LMS core schema — users, roles, courses, enrollments, quizzes, CECs, certificates

Revision ID: 001
Revises:
Create Date: 2026-03-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # Roles                                                                #
    # ------------------------------------------------------------------ #
    op.create_table(
        "lms_roles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("description", sa.Text()),
    )

    # ------------------------------------------------------------------ #
    # LMS Users (extends existing auth users concept with LMS fields)     #
    # ------------------------------------------------------------------ #
    op.create_table(
        "lms_users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.Text()),
        sa.Column("bio", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("theme_preference", sa.String(10), server_default="light"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "lms_user_roles",
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("lms_roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ------------------------------------------------------------------ #
    # Courses                                                              #
    # ------------------------------------------------------------------ #
    op.create_table(
        "lms_courses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("short_description", sa.String(500)),
        sa.Column("thumbnail_url", sa.Text()),
        sa.Column("instructor_id", UUID(as_uuid=True), sa.ForeignKey("lms_users.id"), nullable=False),
        sa.Column("status", sa.String(50), server_default="draft"),  # draft|published|archived
        sa.Column("price_aud", sa.Numeric(10, 2), server_default="0"),
        sa.Column("is_free", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("duration_hours", sa.Numeric(5, 1)),
        sa.Column("level", sa.String(50)),   # beginner|intermediate|advanced
        sa.Column("category", sa.String(100)),
        sa.Column("tags", JSONB(), server_default="[]"),
        # IICRC & CPP40421 fields
        sa.Column("iicrc_discipline", sa.String(10)),          # WRT|CRT|OCT|ASD|CCT
        sa.Column("cec_hours", sa.Numeric(5, 1)),              # IICRC CECs awarded on completion
        sa.Column("cppp40421_unit_code", sa.String(20)),       # e.g. CPPCLO4027
        sa.Column("cppp40421_unit_name", sa.Text()),           # full unit name
        sa.Column("meta", JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "lms_modules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("lms_courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("is_preview", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "lms_lessons",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("module_id", UUID(as_uuid=True), sa.ForeignKey("lms_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content_type", sa.String(50)),  # video|pdf|text|quiz|drive_file
        sa.Column("content_body", sa.Text()),
        sa.Column("drive_file_id", sa.String(255)),  # Google Drive file ID
        sa.Column("duration_minutes", sa.Integer()),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("is_preview", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ------------------------------------------------------------------ #
    # Enrolments & Progress                                               #
    # ------------------------------------------------------------------ #
    op.create_table(
        "lms_enrollments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("lms_courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(50), server_default="active"),  # active|completed|suspended
        sa.Column("payment_reference", sa.String(255)),
        sa.UniqueConstraint("student_id", "course_id", name="uq_lms_enrollment"),
    )

    op.create_table(
        "lms_progress",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("enrollment_id", UUID(as_uuid=True), sa.ForeignKey("lms_enrollments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", UUID(as_uuid=True), sa.ForeignKey("lms_lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("time_spent_seconds", sa.Integer(), server_default="0"),
        sa.UniqueConstraint("enrollment_id", "lesson_id", name="uq_lms_progress"),
    )

    # ------------------------------------------------------------------ #
    # Assessments                                                          #
    # ------------------------------------------------------------------ #
    op.create_table(
        "lms_quizzes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("lesson_id", UUID(as_uuid=True), sa.ForeignKey("lms_lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("pass_percentage", sa.Integer(), server_default="70"),
        sa.Column("time_limit_minutes", sa.Integer()),
        sa.Column("attempts_allowed", sa.Integer(), server_default="3"),
    )

    op.create_table(
        "lms_quiz_questions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("quiz_id", UUID(as_uuid=True), sa.ForeignKey("lms_quizzes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(50), server_default="multiple_choice"),
        sa.Column("options", JSONB()),   # [{"text": "...", "is_correct": true}]
        sa.Column("explanation", sa.Text()),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), server_default="1"),
    )

    op.create_table(
        "lms_quiz_attempts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("quiz_id", UUID(as_uuid=True), sa.ForeignKey("lms_quizzes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answers", JSONB()),  # {question_id: answer}
        sa.Column("score_percentage", sa.Numeric(5, 2)),
        sa.Column("passed", sa.Boolean()),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )

    # ------------------------------------------------------------------ #
    # IICRC CEC Ledger                                                     #
    # ------------------------------------------------------------------ #
    op.create_table(
        "lms_certificates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("lms_courses.id"), nullable=False),
        sa.Column("credential_id", sa.String(30), unique=True, nullable=False),
        sa.Column("pdf_drive_file_id", sa.String(255)),
        sa.Column("pdf_url", sa.Text()),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("is_revoked", sa.Boolean(), server_default=sa.text("false")),
    )

    op.create_table(
        "lms_cec_transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("lms_courses.id"), nullable=False),
        sa.Column("certificate_id", UUID(as_uuid=True), sa.ForeignKey("lms_certificates.id")),
        sa.Column("iicrc_discipline", sa.String(10)),
        sa.Column("cec_hours", sa.Numeric(5, 1), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ------------------------------------------------------------------ #
    # Lesson Notes                                                         #
    # ------------------------------------------------------------------ #
    op.create_table(
        "lms_lesson_notes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", UUID(as_uuid=True), sa.ForeignKey("lms_lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("student_id", "lesson_id", name="uq_lms_lesson_note"),
    )

    # ------------------------------------------------------------------ #
    # Google Drive Assets                                                  #
    # ------------------------------------------------------------------ #
    op.create_table(
        "lms_drive_assets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("drive_file_id", sa.String(255), unique=True, nullable=False),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(100)),
        sa.Column("file_size_bytes", sa.BigInteger()),
        sa.Column("drive_url", sa.Text()),
        sa.Column("uploaded_by", UUID(as_uuid=True), sa.ForeignKey("lms_users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ------------------------------------------------------------------ #
    # Seed default roles                                                   #
    # ------------------------------------------------------------------ #
    op.execute(
        """
        INSERT INTO lms_roles (name, description) VALUES
        ('admin',      'Full platform administrator'),
        ('instructor', 'Can create and manage courses'),
        ('student',    'Can enrol in and complete courses')
        """
    )


def downgrade() -> None:
    tables = [
        "lms_drive_assets",
        "lms_lesson_notes",
        "lms_cec_transactions",
        "lms_certificates",
        "lms_quiz_attempts",
        "lms_quiz_questions",
        "lms_quizzes",
        "lms_progress",
        "lms_enrollments",
        "lms_lessons",
        "lms_modules",
        "lms_courses",
        "lms_user_roles",
        "lms_users",
        "lms_roles",
    ]
    for table in tables:
        op.drop_table(table)
