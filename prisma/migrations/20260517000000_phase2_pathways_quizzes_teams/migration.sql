-- Phase 2: pathways junction, quizzes, teams

CREATE TABLE "lms_learning_pathway_courses" (
    "pathway_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lms_learning_pathway_courses_pkey" PRIMARY KEY ("pathway_id","course_id")
);

CREATE TABLE "lms_quizzes" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "pass_percentage" INTEGER NOT NULL DEFAULT 70,
    "time_limit_minutes" INTEGER,
    "attempts_allowed" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_quizzes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lms_quiz_questions" (
    "id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lms_quiz_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lms_quiz_attempts" (
    "id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "score_percent" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_quiz_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lms_teams" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "bundle_tier" VARCHAR(32) NOT NULL,
    "seat_limit" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lms_team_members" (
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(16) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_team_members_pkey" PRIMARY KEY ("team_id","user_id")
);

CREATE TABLE "lms_team_invites" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "role" VARCHAR(16) NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_team_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lms_teams_slug_key" ON "lms_teams"("slug");
CREATE UNIQUE INDEX "lms_team_invites_token_key" ON "lms_team_invites"("token");
CREATE INDEX "lms_quizzes_course_id_idx" ON "lms_quizzes"("course_id");
CREATE INDEX "lms_quiz_questions_quiz_id_idx" ON "lms_quiz_questions"("quiz_id");
CREATE INDEX "lms_quiz_attempts_quiz_id_student_id_idx" ON "lms_quiz_attempts"("quiz_id", "student_id");
CREATE INDEX "lms_team_invites_team_id_idx" ON "lms_team_invites"("team_id");
CREATE INDEX "lms_team_invites_email_idx" ON "lms_team_invites"("email");

ALTER TABLE "lms_learning_pathway_courses" ADD CONSTRAINT "lms_learning_pathway_courses_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "lms_learning_pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_learning_pathway_courses" ADD CONSTRAINT "lms_learning_pathway_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_quizzes" ADD CONSTRAINT "lms_quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_quiz_questions" ADD CONSTRAINT "lms_quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "lms_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_quiz_attempts" ADD CONSTRAINT "lms_quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "lms_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_quiz_attempts" ADD CONSTRAINT "lms_quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_teams" ADD CONSTRAINT "lms_teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_team_members" ADD CONSTRAINT "lms_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "lms_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_team_members" ADD CONSTRAINT "lms_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_team_invites" ADD CONSTRAINT "lms_team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "lms_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
