-- Instructor/admin public replies to course reviews (GP-118). Additive nullable columns.

-- AlterTable
ALTER TABLE "lms_course_reviews" ADD COLUMN "reply" TEXT,
    ADD COLUMN "replied_at" TIMESTAMPTZ(6),
    ADD COLUMN "replied_by_id" UUID;

-- AddForeignKey
ALTER TABLE "lms_course_reviews" ADD CONSTRAINT "lms_course_reviews_replied_by_id_fkey" FOREIGN KEY ("replied_by_id") REFERENCES "lms_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
