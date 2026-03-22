-- =============================================================================
-- CARSI LMS — Core Schema for Supabase
-- =============================================================================
-- Mirrors Alembic migration 001_lms_core_schema.py
-- Uses Supabase Auth (auth.users) for user management
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. LMS Roles (reference table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_roles (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(50)     NOT NULL UNIQUE,
    description     TEXT
);

INSERT INTO public.lms_roles (name, description) VALUES
    ('admin', 'Full platform administrator'),
    ('instructor', 'Can create and manage courses'),
    ('student', 'Can enrol in and complete courses')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. LMS Users — extends Supabase auth.users with LMS-specific fields
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_users (
    id                      UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email                   VARCHAR(255)    NOT NULL UNIQUE,
    full_name               VARCHAR(255)    NOT NULL,
    avatar_url              TEXT,
    bio                     TEXT,
    is_active               BOOLEAN         NOT NULL DEFAULT true,
    is_verified             BOOLEAN         NOT NULL DEFAULT false,
    theme_preference        VARCHAR(10)     NOT NULL DEFAULT 'light',
    -- IICRC professional identity (from migration 003)
    iicrc_member_number     VARCHAR(20),
    iicrc_card_image_url    TEXT,
    iicrc_expiry_date       DATE,
    iicrc_certifications    JSONB           NOT NULL DEFAULT '[]'::jsonb,
    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_users_email_idx ON public.lms_users (email);

-- ---------------------------------------------------------------------------
-- 3. LMS User Roles (junction table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_user_roles (
    user_id         UUID            NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
    role_id         INTEGER         NOT NULL REFERENCES public.lms_roles(id) ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- 4. LMS Courses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_courses (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                    VARCHAR(255)    NOT NULL UNIQUE,
    title                   VARCHAR(500)    NOT NULL,
    description             TEXT,
    short_description       VARCHAR(500),
    thumbnail_url           TEXT,
    instructor_id           UUID            NOT NULL REFERENCES public.lms_users(id),
    status                  VARCHAR(50)     NOT NULL DEFAULT 'draft',  -- draft|published|archived
    price_aud               NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    is_free                 BOOLEAN         NOT NULL DEFAULT false,
    duration_hours          NUMERIC(5, 1),
    level                   VARCHAR(50),    -- beginner|intermediate|advanced
    category                VARCHAR(100),
    tags                    JSONB           NOT NULL DEFAULT '[]'::jsonb,
    -- IICRC & CPP40421 fields
    iicrc_discipline        VARCHAR(10),    -- WRT|CRT|OCT|ASD|CCT
    cec_hours               NUMERIC(5, 1),
    cppp40421_unit_code     VARCHAR(20),
    cppp40421_unit_name     TEXT,
    -- Course tier (from migration 013)
    tier                    VARCHAR(20)     NOT NULL DEFAULT 'free',  -- free|paid|premium
    -- Metadata
    meta                    JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_courses_slug_idx ON public.lms_courses (slug);
CREATE INDEX IF NOT EXISTS lms_courses_status_idx ON public.lms_courses (status);
CREATE INDEX IF NOT EXISTS lms_courses_instructor_idx ON public.lms_courses (instructor_id);
CREATE INDEX IF NOT EXISTS lms_courses_iicrc_idx ON public.lms_courses (iicrc_discipline);

-- ---------------------------------------------------------------------------
-- 5. LMS Modules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_modules (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID            NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    title           VARCHAR(500)    NOT NULL,
    description     TEXT,
    order_index     INTEGER         NOT NULL,
    is_preview      BOOLEAN         NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_modules_course_idx ON public.lms_modules (course_id);

-- ---------------------------------------------------------------------------
-- 6. LMS Lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_lessons (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id           UUID            NOT NULL REFERENCES public.lms_modules(id) ON DELETE CASCADE,
    title               VARCHAR(500)    NOT NULL,
    content_type        VARCHAR(50),    -- video|pdf|text|quiz|drive_file
    content_body        TEXT,
    drive_file_id       VARCHAR(255),
    duration_minutes    INTEGER,
    order_index         INTEGER         NOT NULL,
    is_preview          BOOLEAN         NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_lessons_module_idx ON public.lms_lessons (module_id);

-- ---------------------------------------------------------------------------
-- 7. LMS Enrollments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_enrollments (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID            NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
    course_id           UUID            NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    enrolled_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    status              VARCHAR(50)     NOT NULL DEFAULT 'active',  -- active|completed|suspended
    payment_reference   VARCHAR(255),
    UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS lms_enrollments_student_idx ON public.lms_enrollments (student_id);
CREATE INDEX IF NOT EXISTS lms_enrollments_course_idx ON public.lms_enrollments (course_id);

-- ---------------------------------------------------------------------------
-- 8. LMS Progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_progress (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id       UUID            NOT NULL REFERENCES public.lms_enrollments(id) ON DELETE CASCADE,
    lesson_id           UUID            NOT NULL REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    completed_at        TIMESTAMPTZ,
    time_spent_seconds  INTEGER         NOT NULL DEFAULT 0,
    UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lms_progress_enrollment_idx ON public.lms_progress (enrollment_id);

-- ---------------------------------------------------------------------------
-- 9. LMS Quizzes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_quizzes (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id           UUID            NOT NULL REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    title               VARCHAR(500)    NOT NULL,
    pass_percentage     INTEGER         NOT NULL DEFAULT 70,
    time_limit_minutes  INTEGER,
    attempts_allowed    INTEGER         NOT NULL DEFAULT 3
);

CREATE INDEX IF NOT EXISTS lms_quizzes_lesson_idx ON public.lms_quizzes (lesson_id);

-- ---------------------------------------------------------------------------
-- 10. LMS Quiz Questions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_quiz_questions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID            NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    question_text   TEXT            NOT NULL,
    question_type   VARCHAR(50)     NOT NULL DEFAULT 'multiple_choice',
    options         JSONB,          -- [{"text": "...", "is_correct": true}]
    explanation     TEXT,
    order_index     INTEGER         NOT NULL,
    points          INTEGER         NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS lms_quiz_questions_quiz_idx ON public.lms_quiz_questions (quiz_id);

-- ---------------------------------------------------------------------------
-- 11. LMS Quiz Attempts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_quiz_attempts (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id             UUID            NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    student_id          UUID            NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
    answers             JSONB,          -- {question_id: answer}
    score_percentage    NUMERIC(5, 2),
    passed              BOOLEAN,
    started_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS lms_quiz_attempts_quiz_idx ON public.lms_quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS lms_quiz_attempts_student_idx ON public.lms_quiz_attempts (student_id);

-- ---------------------------------------------------------------------------
-- 12. LMS Certificates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_certificates (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID            NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
    course_id           UUID            NOT NULL REFERENCES public.lms_courses(id),
    credential_id       VARCHAR(30)     NOT NULL UNIQUE,
    pdf_drive_file_id   VARCHAR(255),
    pdf_url             TEXT,
    issued_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    is_revoked          BOOLEAN         NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS lms_certificates_student_idx ON public.lms_certificates (student_id);
CREATE INDEX IF NOT EXISTS lms_certificates_credential_idx ON public.lms_certificates (credential_id);

-- ---------------------------------------------------------------------------
-- 13. LMS CEC Transactions (IICRC Continuing Education Credits)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_cec_transactions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID            NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
    course_id           UUID            NOT NULL REFERENCES public.lms_courses(id),
    certificate_id      UUID            REFERENCES public.lms_certificates(id),
    iicrc_discipline    VARCHAR(10),
    cec_hours           NUMERIC(5, 1)   NOT NULL,
    earned_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_cec_transactions_student_idx ON public.lms_cec_transactions (student_id);

-- ---------------------------------------------------------------------------
-- 14. LMS Lesson Notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_lesson_notes (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID            NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
    lesson_id       UUID            NOT NULL REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    content         TEXT,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lms_lesson_notes_student_idx ON public.lms_lesson_notes (student_id);

-- ---------------------------------------------------------------------------
-- 15. LMS Drive Assets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_drive_assets (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_file_id       VARCHAR(255)    NOT NULL UNIQUE,
    file_name           VARCHAR(500)    NOT NULL,
    mime_type           VARCHAR(100),
    file_size_bytes     BIGINT,
    drive_url           TEXT,
    uploaded_by         UUID            REFERENCES public.lms_users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 16. LMS Subscriptions (Stripe)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_subscriptions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id              UUID            NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
    stripe_subscription_id  VARCHAR(255)    NOT NULL UNIQUE,
    stripe_customer_id      VARCHAR(255)    NOT NULL,
    status                  VARCHAR(50)     NOT NULL DEFAULT 'trialling',
    plan                    VARCHAR(50)     NOT NULL DEFAULT 'yearly',
    trial_ends_at           TIMESTAMPTZ,
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_subscriptions_student_idx ON public.lms_subscriptions (student_id);
CREATE INDEX IF NOT EXISTS lms_subscriptions_status_idx ON public.lms_subscriptions (status);

-- ---------------------------------------------------------------------------
-- 17. LMS Categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_categories (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)    NOT NULL,
    slug            VARCHAR(255)    NOT NULL UNIQUE,
    description     TEXT,
    parent_id       UUID            REFERENCES public.lms_categories(id),
    order_index     INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_categories_slug_idx ON public.lms_categories (slug);
CREATE INDEX IF NOT EXISTS lms_categories_parent_idx ON public.lms_categories (parent_id);

-- ---------------------------------------------------------------------------
-- 18. LMS Course Reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_course_reviews (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID            NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    student_id      UUID            NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
    rating          INTEGER         NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text     TEXT,
    is_verified     BOOLEAN         NOT NULL DEFAULT false,
    is_published    BOOLEAN         NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS lms_course_reviews_course_idx ON public.lms_course_reviews (course_id);

-- ---------------------------------------------------------------------------
-- Triggers for updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lms_users_updated_at
    BEFORE UPDATE ON public.lms_users
    FOR EACH ROW EXECUTE FUNCTION public.lms_handle_updated_at();

CREATE TRIGGER lms_courses_updated_at
    BEFORE UPDATE ON public.lms_courses
    FOR EACH ROW EXECUTE FUNCTION public.lms_handle_updated_at();

CREATE TRIGGER lms_subscriptions_updated_at
    BEFORE UPDATE ON public.lms_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.lms_handle_updated_at();

CREATE TRIGGER lms_lesson_notes_updated_at
    BEFORE UPDATE ON public.lms_lesson_notes
    FOR EACH ROW EXECUTE FUNCTION public.lms_handle_updated_at();
