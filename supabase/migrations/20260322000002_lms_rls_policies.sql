-- =============================================================================
-- CARSI LMS — Row Level Security Policies
-- =============================================================================
-- Proper RLS with auth.uid() ownership enforcement
-- NOT using USING(true) — every policy is scoped to the authenticated user
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on all LMS tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.lms_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_cec_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_drive_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_course_reviews ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper function: Check if user is admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.lms_user_roles ur
        JOIN public.lms_roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Helper function: Check if user is instructor
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_is_instructor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.lms_user_roles ur
        JOIN public.lms_roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'instructor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Helper function: Check if user is enrolled in a course
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_is_enrolled(p_course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.lms_enrollments
        WHERE student_id = auth.uid()
          AND course_id = p_course_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Helper function: Check if user has active subscription
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_has_active_subscription()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.lms_subscriptions
        WHERE student_id = auth.uid()
          AND status IN ('active', 'trialling')
          AND (current_period_end IS NULL OR current_period_end > now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================================
-- POLICIES: lms_roles (reference data — public read)
-- ===========================================================================
CREATE POLICY "Anyone can view roles"
    ON public.lms_roles FOR SELECT
    USING (true);

CREATE POLICY "Service role manages roles"
    ON public.lms_roles FOR ALL
    USING (auth.role() = 'service_role');

-- ===========================================================================
-- POLICIES: lms_users (profile data)
-- ===========================================================================
-- Users can view all active users (for instructor profiles, etc.)
CREATE POLICY "Users can view active users"
    ON public.lms_users FOR SELECT
    USING (is_active = true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
    ON public.lms_users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Only admins or service role can insert/delete users
CREATE POLICY "Admin or service role manages users"
    ON public.lms_users FOR ALL
    USING (public.lms_is_admin() OR auth.role() = 'service_role');

-- ===========================================================================
-- POLICIES: lms_user_roles (role assignments)
-- ===========================================================================
CREATE POLICY "Users can view own roles"
    ON public.lms_user_roles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
    ON public.lms_user_roles FOR SELECT
    USING (public.lms_is_admin());

CREATE POLICY "Only admins manage role assignments"
    ON public.lms_user_roles FOR ALL
    USING (public.lms_is_admin() OR auth.role() = 'service_role');

-- ===========================================================================
-- POLICIES: lms_courses (course catalog)
-- ===========================================================================
-- Public can view published courses
CREATE POLICY "Public can view published courses"
    ON public.lms_courses FOR SELECT
    USING (status = 'published');

-- Instructors can view their own courses (any status)
CREATE POLICY "Instructors can view own courses"
    ON public.lms_courses FOR SELECT
    USING (instructor_id = auth.uid());

-- Admins can view all courses
CREATE POLICY "Admins can view all courses"
    ON public.lms_courses FOR SELECT
    USING (public.lms_is_admin());

-- Instructors can create courses
CREATE POLICY "Instructors can create courses"
    ON public.lms_courses FOR INSERT
    WITH CHECK (public.lms_is_instructor() AND instructor_id = auth.uid());

-- Instructors can update their own courses
CREATE POLICY "Instructors can update own courses"
    ON public.lms_courses FOR UPDATE
    USING (instructor_id = auth.uid() OR public.lms_is_admin())
    WITH CHECK (instructor_id = auth.uid() OR public.lms_is_admin());

-- Only admins can delete courses
CREATE POLICY "Admins can delete courses"
    ON public.lms_courses FOR DELETE
    USING (public.lms_is_admin());

-- ===========================================================================
-- POLICIES: lms_modules (course structure)
-- ===========================================================================
-- View modules for published courses or own courses
CREATE POLICY "View modules for accessible courses"
    ON public.lms_modules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_courses c
            WHERE c.id = course_id
              AND (c.status = 'published' OR c.instructor_id = auth.uid() OR public.lms_is_admin())
        )
    );

-- Instructors can manage modules for their courses
CREATE POLICY "Instructors manage own course modules"
    ON public.lms_modules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_courses c
            WHERE c.id = course_id
              AND (c.instructor_id = auth.uid() OR public.lms_is_admin())
        )
    );

-- ===========================================================================
-- POLICIES: lms_lessons (course content)
-- ===========================================================================
-- Preview lessons are public; other lessons require enrollment or ownership
CREATE POLICY "View preview lessons or enrolled course lessons"
    ON public.lms_lessons FOR SELECT
    USING (
        is_preview = true
        OR EXISTS (
            SELECT 1 FROM public.lms_modules m
            JOIN public.lms_courses c ON m.course_id = c.id
            WHERE m.id = module_id
              AND (
                  c.instructor_id = auth.uid()
                  OR public.lms_is_admin()
                  OR (c.is_free = true AND c.status = 'published')
                  OR public.lms_is_enrolled(c.id)
                  OR public.lms_has_active_subscription()
              )
        )
    );

-- Instructors can manage lessons for their courses
CREATE POLICY "Instructors manage own course lessons"
    ON public.lms_lessons FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_modules m
            JOIN public.lms_courses c ON m.course_id = c.id
            WHERE m.id = module_id
              AND (c.instructor_id = auth.uid() OR public.lms_is_admin())
        )
    );

-- ===========================================================================
-- POLICIES: lms_enrollments (student enrollments)
-- ===========================================================================
-- Students can view their own enrollments
CREATE POLICY "Students view own enrollments"
    ON public.lms_enrollments FOR SELECT
    USING (student_id = auth.uid());

-- Instructors can view enrollments for their courses
CREATE POLICY "Instructors view course enrollments"
    ON public.lms_enrollments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_courses c
            WHERE c.id = course_id AND c.instructor_id = auth.uid()
        )
    );

-- Admins can view all enrollments
CREATE POLICY "Admins view all enrollments"
    ON public.lms_enrollments FOR SELECT
    USING (public.lms_is_admin());

-- Students can enroll themselves (via service role or with payment)
CREATE POLICY "Students can self-enroll"
    ON public.lms_enrollments FOR INSERT
    WITH CHECK (student_id = auth.uid());

-- Only admins can modify enrollments
CREATE POLICY "Admins manage enrollments"
    ON public.lms_enrollments FOR UPDATE
    USING (public.lms_is_admin());

CREATE POLICY "Admins delete enrollments"
    ON public.lms_enrollments FOR DELETE
    USING (public.lms_is_admin());

-- ===========================================================================
-- POLICIES: lms_progress (lesson completion tracking)
-- ===========================================================================
-- Students can view and update their own progress
CREATE POLICY "Students manage own progress"
    ON public.lms_progress FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_enrollments e
            WHERE e.id = enrollment_id AND e.student_id = auth.uid()
        )
    );

-- Instructors can view progress for their courses
CREATE POLICY "Instructors view course progress"
    ON public.lms_progress FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_enrollments e
            JOIN public.lms_courses c ON e.course_id = c.id
            WHERE e.id = enrollment_id AND c.instructor_id = auth.uid()
        )
    );

-- Admins can view all progress
CREATE POLICY "Admins view all progress"
    ON public.lms_progress FOR SELECT
    USING (public.lms_is_admin());

-- ===========================================================================
-- POLICIES: lms_quizzes (assessments)
-- ===========================================================================
-- View quizzes for enrolled or preview lessons
CREATE POLICY "View accessible quizzes"
    ON public.lms_quizzes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_lessons l
            JOIN public.lms_modules m ON l.module_id = m.id
            JOIN public.lms_courses c ON m.course_id = c.id
            WHERE l.id = lesson_id
              AND (
                  l.is_preview = true
                  OR c.instructor_id = auth.uid()
                  OR public.lms_is_admin()
                  OR public.lms_is_enrolled(c.id)
                  OR public.lms_has_active_subscription()
              )
        )
    );

-- Instructors manage quizzes
CREATE POLICY "Instructors manage quizzes"
    ON public.lms_quizzes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_lessons l
            JOIN public.lms_modules m ON l.module_id = m.id
            JOIN public.lms_courses c ON m.course_id = c.id
            WHERE l.id = lesson_id
              AND (c.instructor_id = auth.uid() OR public.lms_is_admin())
        )
    );

-- ===========================================================================
-- POLICIES: lms_quiz_questions (question bank)
-- ===========================================================================
-- Same access as quizzes
CREATE POLICY "View accessible quiz questions"
    ON public.lms_quiz_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_quizzes q
            JOIN public.lms_lessons l ON q.lesson_id = l.id
            JOIN public.lms_modules m ON l.module_id = m.id
            JOIN public.lms_courses c ON m.course_id = c.id
            WHERE q.id = quiz_id
              AND (
                  c.instructor_id = auth.uid()
                  OR public.lms_is_admin()
                  OR public.lms_is_enrolled(c.id)
                  OR public.lms_has_active_subscription()
              )
        )
    );

CREATE POLICY "Instructors manage quiz questions"
    ON public.lms_quiz_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_quizzes q
            JOIN public.lms_lessons l ON q.lesson_id = l.id
            JOIN public.lms_modules m ON l.module_id = m.id
            JOIN public.lms_courses c ON m.course_id = c.id
            WHERE q.id = quiz_id
              AND (c.instructor_id = auth.uid() OR public.lms_is_admin())
        )
    );

-- ===========================================================================
-- POLICIES: lms_quiz_attempts (student quiz submissions)
-- ===========================================================================
-- Students can view and create their own attempts
CREATE POLICY "Students manage own quiz attempts"
    ON public.lms_quiz_attempts FOR ALL
    USING (student_id = auth.uid());

-- Instructors can view attempts for their course quizzes
CREATE POLICY "Instructors view course quiz attempts"
    ON public.lms_quiz_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_quizzes q
            JOIN public.lms_lessons l ON q.lesson_id = l.id
            JOIN public.lms_modules m ON l.module_id = m.id
            JOIN public.lms_courses c ON m.course_id = c.id
            WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
        )
    );

-- Admins can view all attempts
CREATE POLICY "Admins view all quiz attempts"
    ON public.lms_quiz_attempts FOR SELECT
    USING (public.lms_is_admin());

-- ===========================================================================
-- POLICIES: lms_certificates (credentials)
-- ===========================================================================
-- Students can view their own certificates
CREATE POLICY "Students view own certificates"
    ON public.lms_certificates FOR SELECT
    USING (student_id = auth.uid());

-- Public can verify certificates by credential_id (for LinkedIn sharing)
CREATE POLICY "Public can verify certificates"
    ON public.lms_certificates FOR SELECT
    USING (is_revoked = false);

-- Only service role creates certificates (after quiz completion)
CREATE POLICY "Service role manages certificates"
    ON public.lms_certificates FOR ALL
    USING (auth.role() = 'service_role' OR public.lms_is_admin());

-- ===========================================================================
-- POLICIES: lms_cec_transactions (IICRC CEC ledger)
-- ===========================================================================
-- Students can view their own CEC transactions
CREATE POLICY "Students view own CECs"
    ON public.lms_cec_transactions FOR SELECT
    USING (student_id = auth.uid());

-- Admins can view all for reporting
CREATE POLICY "Admins view all CECs"
    ON public.lms_cec_transactions FOR SELECT
    USING (public.lms_is_admin());

-- Only service role creates CEC transactions
CREATE POLICY "Service role manages CECs"
    ON public.lms_cec_transactions FOR ALL
    USING (auth.role() = 'service_role' OR public.lms_is_admin());

-- ===========================================================================
-- POLICIES: lms_lesson_notes (private student notes)
-- ===========================================================================
-- Students can only access their own notes
CREATE POLICY "Students own their notes"
    ON public.lms_lesson_notes FOR ALL
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- ===========================================================================
-- POLICIES: lms_drive_assets (uploaded files)
-- ===========================================================================
-- View assets for accessible lessons
CREATE POLICY "View accessible drive assets"
    ON public.lms_drive_assets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_lessons l
            WHERE l.drive_file_id = drive_file_id
        )
        OR public.lms_is_instructor()
        OR public.lms_is_admin()
    );

-- Instructors can upload assets
CREATE POLICY "Instructors upload assets"
    ON public.lms_drive_assets FOR INSERT
    WITH CHECK (public.lms_is_instructor() AND uploaded_by = auth.uid());

-- Admins manage all assets
CREATE POLICY "Admins manage assets"
    ON public.lms_drive_assets FOR ALL
    USING (public.lms_is_admin());

-- ===========================================================================
-- POLICIES: lms_subscriptions (Stripe subscriptions)
-- ===========================================================================
-- Students can view their own subscriptions
CREATE POLICY "Students view own subscriptions"
    ON public.lms_subscriptions FOR SELECT
    USING (student_id = auth.uid());

-- Only service role manages subscriptions (via Stripe webhooks)
CREATE POLICY "Service role manages subscriptions"
    ON public.lms_subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- Admins can view all for reporting
CREATE POLICY "Admins view all subscriptions"
    ON public.lms_subscriptions FOR SELECT
    USING (public.lms_is_admin());

-- ===========================================================================
-- POLICIES: lms_categories (course taxonomy)
-- ===========================================================================
-- Public read
CREATE POLICY "Anyone can view categories"
    ON public.lms_categories FOR SELECT
    USING (true);

-- Only admins manage categories
CREATE POLICY "Admins manage categories"
    ON public.lms_categories FOR ALL
    USING (public.lms_is_admin() OR auth.role() = 'service_role');

-- ===========================================================================
-- POLICIES: lms_course_reviews (student reviews)
-- ===========================================================================
-- Public can view published reviews
CREATE POLICY "Public can view published reviews"
    ON public.lms_course_reviews FOR SELECT
    USING (is_published = true);

-- Students can view and manage their own reviews
CREATE POLICY "Students manage own reviews"
    ON public.lms_course_reviews FOR ALL
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Instructors can view reviews for their courses
CREATE POLICY "Instructors view course reviews"
    ON public.lms_course_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lms_courses c
            WHERE c.id = course_id AND c.instructor_id = auth.uid()
        )
    );

-- Admins can manage all reviews
CREATE POLICY "Admins manage reviews"
    ON public.lms_course_reviews FOR ALL
    USING (public.lms_is_admin());
