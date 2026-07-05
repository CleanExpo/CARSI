-- CreateTable: practical (instructor-graded) assessments + rubric + submissions (GP-457)
CREATE TABLE "lms_practical_assessments" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "pass_threshold" INTEGER NOT NULL DEFAULT 70,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lms_practical_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lms_rubric_criteria" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "max_points" INTEGER NOT NULL DEFAULT 5,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "lms_rubric_criteria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lms_assessment_submissions" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "evidence_text" TEXT NOT NULL,
    "evidence_urls" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "criterion_scores" JSONB NOT NULL DEFAULT '[]',
    "total_score" INTEGER,
    "reviewer_id" UUID,
    "reviewer_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lms_assessment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lms_practical_assessments_course_id_idx" ON "lms_practical_assessments"("course_id");
CREATE INDEX "lms_rubric_criteria_assessment_id_idx" ON "lms_rubric_criteria"("assessment_id");
CREATE INDEX "lms_assessment_submissions_assessment_id_idx" ON "lms_assessment_submissions"("assessment_id");
CREATE INDEX "lms_assessment_submissions_student_id_idx" ON "lms_assessment_submissions"("student_id");
CREATE INDEX "lms_assessment_submissions_status_idx" ON "lms_assessment_submissions"("status");

-- AddForeignKey
ALTER TABLE "lms_practical_assessments" ADD CONSTRAINT "lms_practical_assessments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_rubric_criteria" ADD CONSTRAINT "lms_rubric_criteria_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "lms_practical_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_assessment_submissions" ADD CONSTRAINT "lms_assessment_submissions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "lms_practical_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_assessment_submissions" ADD CONSTRAINT "lms_assessment_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lms_assessment_submissions" ADD CONSTRAINT "lms_assessment_submissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "lms_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
