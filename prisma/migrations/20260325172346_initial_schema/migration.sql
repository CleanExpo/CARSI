-- CreateTable
CREATE TABLE "lms_roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "lms_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "full_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "theme_preference" TEXT,
    "role" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "lms_user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "lms_courses" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "short_description" TEXT,
    "thumbnail_url" TEXT,
    "instructor_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "price_aud" DECIMAL(12,2) NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "duration_hours" DOUBLE PRECISION,
    "level" TEXT,
    "category" TEXT,
    "tags" JSONB,
    "iicrc_discipline" TEXT,
    "cec_hours" DOUBLE PRECISION,
    "meta" JSONB,
    "is_published" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_modules" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_lessons" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_body" TEXT,
    "order_index" INTEGER NOT NULL,
    "is_preview" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_enrollments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "payment_reference" TEXT,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "order_index" INTEGER,

    CONSTRAINT "lms_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_learning_pathways" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "iicrc_discipline" TEXT,
    "target_certification" TEXT,
    "estimated_hours" DOUBLE PRECISION,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lms_learning_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lms_roles_name_key" ON "lms_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lms_users_email_key" ON "lms_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lms_courses_slug_key" ON "lms_courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "uq_lms_enrollment" ON "lms_enrollments"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "lms_categories_slug_key" ON "lms_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "lms_learning_pathways_slug_key" ON "lms_learning_pathways"("slug");

-- AddForeignKey
ALTER TABLE "lms_user_roles" ADD CONSTRAINT "lms_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_user_roles" ADD CONSTRAINT "lms_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "lms_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_courses" ADD CONSTRAINT "lms_courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "lms_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_modules" ADD CONSTRAINT "lms_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_lessons" ADD CONSTRAINT "lms_lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "lms_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
