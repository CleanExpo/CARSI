-- CreateTable
CREATE TABLE "ccw_roadshow_sign_ins" (
    "id" UUID NOT NULL,
    "event_slug" VARCHAR(32) NOT NULL,
    "registration_id" UUID,
    "student_id" UUID,
    "enrollment_id" UUID,
    "full_name" TEXT NOT NULL,
    "business_name" TEXT,
    "iicrc_reg_number" VARCHAR(32),
    "email" VARCHAR(320) NOT NULL,
    "normalized_email" VARCHAR(320) NOT NULL,
    "normalized_business" TEXT,
    "normalized_name" TEXT NOT NULL,
    "day1_checked_in_at" TIMESTAMPTZ(6),
    "day2_checked_in_at" TIMESTAMPTZ(6),
    "is_walk_in" BOOLEAN NOT NULL DEFAULT false,
    "provision_status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "signed_in_by_admin" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ccw_roadshow_sign_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ccw_roadshow_check_in_events" (
    "id" UUID NOT NULL,
    "sign_in_id" UUID NOT NULL,
    "day_index" INTEGER NOT NULL,
    "action" VARCHAR(16) NOT NULL,
    "actor_admin_id" UUID,
    "source" VARCHAR(16) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ccw_roadshow_check_in_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ccw_roadshow_sign_ins_enrollment_id_key" ON "ccw_roadshow_sign_ins"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "ccw_roadshow_sign_ins_event_slug_normalized_email_key" ON "ccw_roadshow_sign_ins"("event_slug", "normalized_email");

-- CreateIndex
CREATE INDEX "ccw_roadshow_sign_ins_event_slug_normalized_business_idx" ON "ccw_roadshow_sign_ins"("event_slug", "normalized_business");

-- CreateIndex
CREATE INDEX "ccw_roadshow_sign_ins_event_slug_normalized_name_idx" ON "ccw_roadshow_sign_ins"("event_slug", "normalized_name");

-- CreateIndex
CREATE INDEX "ccw_roadshow_check_in_events_sign_in_id_idx" ON "ccw_roadshow_check_in_events"("sign_in_id");

-- AddForeignKey
ALTER TABLE "ccw_roadshow_sign_ins" ADD CONSTRAINT "ccw_roadshow_sign_ins_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "ccw_roadshow_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ccw_roadshow_sign_ins" ADD CONSTRAINT "ccw_roadshow_sign_ins_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ccw_roadshow_sign_ins" ADD CONSTRAINT "ccw_roadshow_sign_ins_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ccw_roadshow_check_in_events" ADD CONSTRAINT "ccw_roadshow_check_in_events_sign_in_id_fkey" FOREIGN KEY ("sign_in_id") REFERENCES "ccw_roadshow_sign_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
