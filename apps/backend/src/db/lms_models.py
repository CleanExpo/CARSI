"""
CARSI LMS — SQLAlchemy ORM Models

All LMS tables use the lms_ prefix to coexist cleanly with the starter
project's existing schema. Models map 1:1 to migrations 001 and 002.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from .models import Base  # shared Base from starter project


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------


class LMSRole(Base):
    __tablename__ = "lms_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)

    user_roles = relationship("LMSUserRole", back_populates="role")


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


class LMSUser(Base):
    __tablename__ = "lms_users"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(Text)
    bio = Column(Text)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    theme_preference = Column(String(10), default="light")
    # IICRC Professional Identity (migration 003)
    iicrc_member_number = Column(String(20), nullable=True)
    iicrc_card_image_url = Column(Text, nullable=True)
    iicrc_expiry_date = Column(Date, nullable=True)
    iicrc_certifications = Column(JSONB, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_roles = relationship("LMSUserRole", back_populates="user", cascade="all, delete-orphan")
    courses_taught = relationship("LMSCourse", back_populates="instructor")
    enrollments = relationship("LMSEnrollment", back_populates="student", cascade="all, delete-orphan")
    cec_transactions = relationship("LMSCECTransaction", back_populates="student")
    certificates = relationship("LMSCertificate", back_populates="student")
    lesson_notes = relationship("LMSLessonNote", back_populates="student", cascade="all, delete-orphan")
    xp_events = relationship("LMSXPEvent", back_populates="student", cascade="all, delete-orphan")
    user_level = relationship("LMSUserLevel", back_populates="student", uselist=False, cascade="all, delete-orphan")
    subscriptions = relationship("LMSSubscription", back_populates="student", cascade="all, delete-orphan")
    cec_reports = relationship("LMSCECReport", back_populates="student", cascade="all, delete-orphan")

    @property
    def roles(self) -> list[str]:
        return [ur.role.name for ur in self.user_roles if ur.role]


class LMSUserRole(Base):
    __tablename__ = "lms_user_roles"

    user_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("lms_roles.id", ondelete="CASCADE"), primary_key=True)
    granted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("LMSUser", back_populates="user_roles")
    role = relationship("LMSRole", back_populates="user_roles")


# ---------------------------------------------------------------------------
# Courses
# ---------------------------------------------------------------------------


class LMSCourse(Base):
    __tablename__ = "lms_courses"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    short_description = Column(String(500))
    thumbnail_url = Column(Text)
    instructor_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id"), nullable=False)
    status = Column(String(50), default="draft")  # draft|published|archived
    price_aud = Column(Numeric(10, 2), default=Decimal("0"))
    is_free = Column(Boolean, default=False)
    duration_hours = Column(Numeric(5, 1))
    level = Column(String(50))   # beginner|intermediate|advanced
    category = Column(String(100))
    tags = Column(JSONB, default=list)
    # IICRC & CPP40421 alignment
    iicrc_discipline = Column(String(10))          # WRT|CRT|OCT|ASD|CCT
    cec_hours = Column(Numeric(5, 1))
    cppp40421_unit_code = Column(String(20))
    cppp40421_unit_name = Column(Text)
    meta = Column(JSONB, default=dict)
    # Migration 002 additions
    difficulty = Column(String(50))                # beginner|intermediate|advanced|expert
    estimated_duration_hours = Column(Numeric(5, 1))
    category_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_categories.id", ondelete="SET NULL"))
    learning_objectives = Column(JSONB, default=list)
    migration_source = Column(String(50))          # google_drive|manual|import
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    instructor = relationship("LMSUser", back_populates="courses_taught")
    modules = relationship(
        "LMSModule",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="LMSModule.order_index",
    )
    enrollments = relationship("LMSEnrollment", back_populates="course")
    certificates = relationship("LMSCertificate", back_populates="course")
    cec_transactions = relationship("LMSCECTransaction", back_populates="course")
    category_ref = relationship("LMSCategory", back_populates="courses")
    pathway_courses = relationship("LMSLearningPathwayCourse", back_populates="course")
    prerequisites = relationship(
        "LMSCoursePrerequisite",
        foreign_keys="LMSCoursePrerequisite.course_id",
        back_populates="course",
        cascade="all, delete-orphan",
    )


class LMSModule(Base):
    __tablename__ = "lms_modules"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, nullable=False)
    is_preview = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    course = relationship("LMSCourse", back_populates="modules")
    lessons = relationship(
        "LMSLesson",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="LMSLesson.order_index",
    )


class LMSLesson(Base):
    __tablename__ = "lms_lessons"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_modules.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    content_type = Column(String(50))  # video|pdf|text|quiz|drive_file
    content_body = Column(Text)
    drive_file_id = Column(String(255))
    duration_minutes = Column(Integer)
    order_index = Column(Integer, nullable=False)
    is_preview = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    module = relationship("LMSModule", back_populates="lessons")
    progress_records = relationship("LMSProgress", back_populates="lesson", cascade="all, delete-orphan")
    notes = relationship("LMSLessonNote", back_populates="lesson", cascade="all, delete-orphan")
    quiz = relationship("LMSQuiz", back_populates="lesson", uselist=False, cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Enrolments & Progress
# ---------------------------------------------------------------------------


class LMSEnrollment(Base):
    __tablename__ = "lms_enrollments"
    __table_args__ = (UniqueConstraint("student_id", "course_id", name="uq_lms_enrollment"),)

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True))
    status = Column(String(50), default="active")  # active|completed|suspended
    payment_reference = Column(String(255))

    student = relationship("LMSUser", back_populates="enrollments")
    course = relationship("LMSCourse", back_populates="enrollments")
    progress_records = relationship("LMSProgress", back_populates="enrollment", cascade="all, delete-orphan")

    @property
    def completion_percentage(self) -> float:
        if not self.course or not self.course.modules:
            return 0.0
        total = sum(len(m.lessons) for m in self.course.modules)
        if total == 0:
            return 0.0
        completed = sum(1 for p in self.progress_records if p.completed_at)
        return round((completed / total) * 100, 1)


class LMSProgress(Base):
    __tablename__ = "lms_progress"
    __table_args__ = (UniqueConstraint("enrollment_id", "lesson_id", name="uq_lms_progress"),)

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_enrollments.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_lessons.id", ondelete="CASCADE"), nullable=False)
    completed_at = Column(DateTime(timezone=True))
    time_spent_seconds = Column(Integer, default=0)

    enrollment = relationship("LMSEnrollment", back_populates="progress_records")
    lesson = relationship("LMSLesson", back_populates="progress_records")


# ---------------------------------------------------------------------------
# Assessments
# ---------------------------------------------------------------------------


class LMSQuiz(Base):
    __tablename__ = "lms_quizzes"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_lessons.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    pass_percentage = Column(Integer, default=70)
    time_limit_minutes = Column(Integer)
    attempts_allowed = Column(Integer, default=3)

    lesson = relationship("LMSLesson", back_populates="quiz")
    questions = relationship(
        "LMSQuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="LMSQuizQuestion.order_index",
    )
    attempts = relationship("LMSQuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class LMSQuizQuestion(Base):
    __tablename__ = "lms_quiz_questions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="multiple_choice")
    options = Column(JSONB)  # [{"text": "...", "is_correct": true}]
    explanation = Column(Text)
    order_index = Column(Integer, nullable=False)
    points = Column(Integer, default=1)

    quiz = relationship("LMSQuiz", back_populates="questions")


class LMSQuizAttempt(Base):
    __tablename__ = "lms_quiz_attempts"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_quizzes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False)
    answers = Column(JSONB)
    score_percentage = Column(Numeric(5, 2))
    passed = Column(Boolean)
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True))

    quiz = relationship("LMSQuiz", back_populates="attempts")
    student = relationship("LMSUser")


# ---------------------------------------------------------------------------
# IICRC CEC Tracking & Certificates
# ---------------------------------------------------------------------------


class LMSCertificate(Base):
    __tablename__ = "lms_certificates"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id"), nullable=False)
    credential_id = Column(String(30), unique=True, nullable=False)
    pdf_drive_file_id = Column(String(255))
    pdf_url = Column(Text)
    issued_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    is_revoked = Column(Boolean, default=False)

    student = relationship("LMSUser", back_populates="certificates")
    course = relationship("LMSCourse", back_populates="certificates")
    cec_transactions = relationship("LMSCECTransaction", back_populates="certificate")


class LMSCECTransaction(Base):
    __tablename__ = "lms_cec_transactions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id"), nullable=False)
    certificate_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_certificates.id"))
    iicrc_discipline = Column(String(10))
    cec_hours = Column(Numeric(5, 1), nullable=False)
    earned_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    student = relationship("LMSUser", back_populates="cec_transactions")
    course = relationship("LMSCourse", back_populates="cec_transactions")
    certificate = relationship("LMSCertificate", back_populates="cec_transactions")


# ---------------------------------------------------------------------------
# Lesson Notes
# ---------------------------------------------------------------------------


class LMSLessonNote(Base):
    __tablename__ = "lms_lesson_notes"
    __table_args__ = (UniqueConstraint("student_id", "lesson_id", name="uq_lms_lesson_note"),)

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_lessons.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("LMSUser", back_populates="lesson_notes")
    lesson = relationship("LMSLesson", back_populates="notes")


# ---------------------------------------------------------------------------
# Google Drive Assets
# ---------------------------------------------------------------------------


class LMSDriveAsset(Base):
    __tablename__ = "lms_drive_assets"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drive_file_id = Column(String(255), unique=True, nullable=False)
    file_name = Column(String(500), nullable=False)
    mime_type = Column(String(100))
    file_size_bytes = Column(BigInteger)
    drive_url = Column(Text)
    uploaded_by = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    uploader = relationship("LMSUser")


# ---------------------------------------------------------------------------
# Category Taxonomy (Migration 002)
# ---------------------------------------------------------------------------


class LMSCategory(Base):
    __tablename__ = "lms_categories"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_categories.id", ondelete="SET NULL"))
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    parent = relationship("LMSCategory", remote_side="LMSCategory.id", back_populates="children")
    children = relationship("LMSCategory", back_populates="parent")
    courses = relationship("LMSCourse", back_populates="category_ref")


# ---------------------------------------------------------------------------
# Learning Pathways (Migration 002)
# ---------------------------------------------------------------------------


class LMSLearningPathway(Base):
    __tablename__ = "lms_learning_pathways"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    iicrc_discipline = Column(String(10))          # WRT|CRT|OCT|ASD|CCT
    target_certification = Column(String(100))
    estimated_hours = Column(Numeric(5, 1))
    is_published = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    pathway_courses = relationship(
        "LMSLearningPathwayCourse",
        back_populates="pathway",
        cascade="all, delete-orphan",
        order_by="LMSLearningPathwayCourse.order_index",
    )


class LMSLearningPathwayCourse(Base):
    """Junction table: pathway ↔ course with ordering and required flag."""

    __tablename__ = "lms_learning_pathway_courses"

    pathway_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_learning_pathways.id", ondelete="CASCADE"), primary_key=True)
    course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id", ondelete="CASCADE"), primary_key=True)
    order_index = Column(Integer, nullable=False)
    is_required = Column(Boolean, default=True)

    pathway = relationship("LMSLearningPathway", back_populates="pathway_courses")
    course = relationship("LMSCourse", back_populates="pathway_courses")


# ---------------------------------------------------------------------------
# Course Prerequisites (Migration 002)
# ---------------------------------------------------------------------------


class LMSCoursePrerequisite(Base):
    __tablename__ = "lms_course_prerequisites"

    course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id", ondelete="CASCADE"), primary_key=True)
    prerequisite_course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id", ondelete="CASCADE"), primary_key=True)
    is_strict = Column(Boolean, default=False)

    course = relationship("LMSCourse", foreign_keys=[course_id], back_populates="prerequisites")
    prerequisite = relationship("LMSCourse", foreign_keys=[prerequisite_course_id])


# ---------------------------------------------------------------------------
# Migration Jobs (Migration 002)
# ---------------------------------------------------------------------------


class LMSMigrationJob(Base):
    __tablename__ = "lms_migration_jobs"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type = Column(String(50), nullable=False)       # discover|extract|enrich|validate|load
    status = Column(String(50), default="pending")      # pending|running|completed|failed
    total_items = Column(Integer)
    processed_items = Column(Integer, default=0)
    failed_items = Column(Integer, default=0)
    result_manifest = Column(JSONB, default=list)       # discovered/processed items
    error_log = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


# ---------------------------------------------------------------------------
# Gamification — XP Events (Migration 003)
# ---------------------------------------------------------------------------


class LMSXPEvent(Base):
    __tablename__ = "lms_xp_events"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_type = Column(String(50), nullable=False)
    # lesson_completed | quiz_passed | quiz_perfect | course_completed | streak_bonus
    source_id = Column(PGUUID(as_uuid=True), nullable=True)
    xp_awarded = Column(Integer, nullable=False)
    earned_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    student = relationship("LMSUser", back_populates="xp_events")


# ---------------------------------------------------------------------------
# Gamification — User Levels (Migration 003)
# ---------------------------------------------------------------------------


class LMSUserLevel(Base):
    __tablename__ = "lms_user_levels"

    student_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    total_xp = Column(Integer, nullable=False, default=0)
    current_level = Column(Integer, nullable=False, default=1)
    current_streak = Column(Integer, nullable=False, default=0)
    longest_streak = Column(Integer, nullable=False, default=0)
    last_active_date = Column(Date, nullable=True)

    student = relationship("LMSUser", back_populates="user_level")


# ---------------------------------------------------------------------------
# Subscriptions — Stripe Recurring (Migration 003)
# ---------------------------------------------------------------------------


class LMSSubscription(Base):
    __tablename__ = "lms_subscriptions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    stripe_subscription_id = Column(String(255), unique=True, nullable=False)
    stripe_customer_id = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="trialling")
    # trialling | active | past_due | cancelled | unpaid
    plan = Column(String(50), nullable=False, default="yearly")
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    student = relationship("LMSUser", back_populates="subscriptions")


# ---------------------------------------------------------------------------
# IICRC CEC Reports — Email Audit Trail (Migration 003)
# ---------------------------------------------------------------------------


class LMSCECReport(Base):
    __tablename__ = "lms_cec_reports"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    iicrc_member_number = Column(String(20), nullable=False)
    email_to = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    # pending | sent | failed
    sent_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    student = relationship("LMSUser", back_populates="cec_reports")
    course = relationship("LMSCourse")


# ---------------------------------------------------------------------------
# Course Idea Catalog (Migration 004)
# ---------------------------------------------------------------------------


class LMSCourseIdea(Base):
    __tablename__ = "lms_course_ideas"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    iicrc_discipline = Column(String(10), nullable=True)
    suggested_by_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    vote_count = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="idea")
    # idea | in_development | published
    ai_outline = Column(JSONB, nullable=True)
    ai_outline_generated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    suggested_by = relationship("LMSUser")
    votes = relationship("LMSCourseIdeaVote", back_populates="idea", cascade="all, delete-orphan")


class LMSCourseIdeaVote(Base):
    __tablename__ = "lms_course_idea_votes"

    idea_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_course_ideas.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    voted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    idea = relationship("LMSCourseIdea", back_populates="votes")


# ---------------------------------------------------------------------------
# RPL Portfolio — Recognition of Prior Learning (Migration 005)
# ---------------------------------------------------------------------------


class LMSRPLPortfolio(Base):
    __tablename__ = "lms_rpl_portfolios"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    unit_code = Column(String(20), nullable=False)
    unit_name = Column(String(255), nullable=False)
    evidence_description = Column(Text, nullable=False)
    evidence_urls = Column(JSONB, nullable=False, default=list)
    status = Column(String(50), nullable=False, default="pending")
    # pending | under_review | approved | rejected
    reviewer_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("lms_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    student = relationship("LMSUser", foreign_keys=[student_id])
    reviewer = relationship("LMSUser", foreign_keys=[reviewer_id])


# ---------------------------------------------------------------------------
# Course Bundles (Migration 006)
# ---------------------------------------------------------------------------


class LMSBundle(Base):
    __tablename__ = "lms_bundles"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    slug = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    price_aud = Column(Numeric(10, 2), nullable=False)
    original_price_aud = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, default=True)
    industry_tag = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    courses = relationship("LMSCourse", secondary="lms_bundle_courses", backref="bundles")


class LMSBundleCourse(Base):
    __tablename__ = "lms_bundle_courses"

    bundle_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_bundles.id", ondelete="CASCADE"), primary_key=True)
    course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id", ondelete="CASCADE"), primary_key=True)
    display_order = Column(Integer, default=0)
