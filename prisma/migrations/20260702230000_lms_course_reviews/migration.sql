-- Course reviews / star ratings (GP-117). Additive new table — no impact on existing rows.
-- One review per (course, student); gated on an enrolment at the application layer.

-- CreateTable
CREATE TABLE "lms_course_reviews" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_lms_course_review" ON "lms_course_reviews"("course_id", "student_id");

-- CreateIndex
CREATE INDEX "ix_lms_course_review_course_published" ON "lms_course_reviews"("course_id", "is_published");

-- AddForeignKey
ALTER TABLE "lms_course_reviews" ADD CONSTRAINT "lms_course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_course_reviews" ADD CONSTRAINT "lms_course_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
