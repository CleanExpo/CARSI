-- Business Coaching workspace: profile, assessment, plan, sessions, actions.

CREATE TABLE "carsi_coaching_business_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" VARCHAR(255),
    "industry" VARCHAR(120),
    "location" VARCHAR(255),
    "service_areas" TEXT,
    "years_in_business" VARCHAR(64),
    "business_size" VARCHAR(64),
    "employee_count" VARCHAR(64),
    "main_services" TEXT,
    "website" VARCHAR(500),
    "challenges" TEXT,
    "short_term_goals" TEXT,
    "long_term_vision" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carsi_coaching_business_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carsi_coaching_business_profiles_user_id_key"
    ON "carsi_coaching_business_profiles"("user_id");

ALTER TABLE "carsi_coaching_business_profiles"
    ADD CONSTRAINT "carsi_coaching_business_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "carsi_coaching_assessments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "responses_json" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "customer_visible_feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carsi_coaching_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "carsi_coaching_assessments_user_id_status_idx"
    ON "carsi_coaching_assessments"("user_id", "status");

ALTER TABLE "carsi_coaching_assessments"
    ADD CONSTRAINT "carsi_coaching_assessments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "carsi_coaching_growth_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "focus_title" VARCHAR(500),
    "focus_description" TEXT,
    "focus_target_date" TIMESTAMPTZ(6),
    "business_direction" TEXT,
    "goals_json" TEXT,
    "latest_guidance" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carsi_coaching_growth_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carsi_coaching_growth_plans_user_id_key"
    ON "carsi_coaching_growth_plans"("user_id");

ALTER TABLE "carsi_coaching_growth_plans"
    ADD CONSTRAINT "carsi_coaching_growth_plans_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "carsi_coaching_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "coach_name" VARCHAR(120) NOT NULL DEFAULT 'Phill McGurk',
    "meeting_url" VARCHAR(500),
    "status" VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    "prep_responses_json" TEXT,
    "customer_summary" TEXT,
    "decisions_json" TEXT,
    "follow_up_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carsi_coaching_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "carsi_coaching_sessions_user_id_scheduled_at_idx"
    ON "carsi_coaching_sessions"("user_id", "scheduled_at");

ALTER TABLE "carsi_coaching_sessions"
    ADD CONSTRAINT "carsi_coaching_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "carsi_coaching_actions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'todo',
    "due_date" TIMESTAMPTZ(6),
    "priority" VARCHAR(32),
    "assigned_to" VARCHAR(64) NOT NULL DEFAULT 'customer',
    "goal_id" VARCHAR(64),
    "progress_note" TEXT,
    "coach_feedback" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carsi_coaching_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "carsi_coaching_actions_user_id_status_idx"
    ON "carsi_coaching_actions"("user_id", "status");

ALTER TABLE "carsi_coaching_actions"
    ADD CONSTRAINT "carsi_coaching_actions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
