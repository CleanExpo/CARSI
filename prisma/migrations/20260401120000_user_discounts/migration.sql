-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'flat', 'free', 'custom');

-- CreateTable
CREATE TABLE "user_discounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(12,2),
    "expiry_date" TIMESTAMPTZ(6),
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_discounts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_discounts" ADD CONSTRAINT "user_discounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_discounts" ADD CONSTRAINT "user_discounts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "user_discounts_user_id_course_id_idx" ON "user_discounts"("user_id", "course_id");
