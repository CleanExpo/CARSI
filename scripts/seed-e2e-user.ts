/**
 * Seed a deterministic E2E test student into Postgres so Playwright can perform a
 * REAL login (real `auth_token` JWT cookie) and exercise the middleware-protected
 * /dashboard tree against real data.
 *
 * Creates / upserts:
 *   - LmsUser  student@carsi.com.au / student123 (bcrypt-hashed via the SAME
 *     hashPassword the login route uses, so `authenticateWithPassword` succeeds).
 *   - A `student` role row + LmsUserRole link (best-effort; role also set on the
 *     user column so session-role resolution works even without the join row).
 *   - An active LmsEnrollment against the FIRST seeded catalogue course, so the
 *     lesson player (`getLessonContextForStudent` requires an enrollment) and the
 *     student dashboard render real enrolled-course content.
 *
 * Idempotent: safe to re-run. Reads the course/lesson IDs from the same
 * `data/seed/courses-catalog.json` snapshot used by `db:seed-courses`, so it must
 * run AFTER the catalogue seed (the enrolled course must already exist).
 *
 * Usage (target DB):
 *   DATABASE_URL="postgresql://..." npx tsx scripts/seed-e2e-user.ts
 *
 * Loads `.env` when present via dotenv/config.
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/server/lms-auth';
import type { CoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';
import { isCoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');

/** Kept in sync with TEST_STUDENT in e2e/pre-production.spec.ts. */
const E2E_STUDENT = {
  id: 'e2e00000-0000-4000-8000-000000000001',
  email: 'student@carsi.com.au',
  password: 'student123',
  fullName: 'James Wilson',
} as const;

/** Stable enrollment id so re-runs upsert rather than duplicate. */
const E2E_ENROLLMENT_ID = 'e2e00000-0000-4000-8000-000000000002';

function loadCatalog(): CoursesCatalogFile {
  const raw = readFileSync(CATALOG_PATH, 'utf8');
  const data = JSON.parse(raw) as unknown;
  if (!isCoursesCatalogFile(data)) {
    throw new Error('Invalid courses-catalog.json: cannot resolve a course to enrol the E2E user in.');
  }
  return data;
}

async function ensureStudentRole(userId: string): Promise<void> {
  try {
    const role = await prisma.lmsRole.upsert({
      where: { name: 'student' },
      create: { name: 'student', description: 'Student' },
      update: {},
    });
    await prisma.lmsUserRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id },
      update: {},
    });
  } catch (e) {
    // Role wiring is best-effort: the user's `role` column ('student') already
    // drives session-role resolution. Don't fail the seed on a race/duplicate.
    console.warn('[seed-e2e-user] student role wiring skipped:', e instanceof Error ? e.message : e);
  }
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const catalog = loadCatalog();
  const course = catalog.courses[0];
  if (!course) {
    console.error(
      'No courses in catalogue. Run `npm run db:seed-courses` first so the E2E user has a course to enrol in.'
    );
    process.exit(1);
  }

  const hashedPassword = await hashPassword(E2E_STUDENT.password);

  // Upsert the test user by email (the unique login key). Always reset the
  // password hash + active flags so a re-run guarantees a working login.
  const user = await prisma.lmsUser.upsert({
    where: { email: E2E_STUDENT.email },
    create: {
      id: E2E_STUDENT.id,
      email: E2E_STUDENT.email,
      fullName: E2E_STUDENT.fullName,
      hashedPassword,
      isActive: true,
      isVerified: true,
      role: 'student',
    },
    update: {
      fullName: E2E_STUDENT.fullName,
      hashedPassword,
      isActive: true,
      isVerified: true,
      role: 'student',
    },
  });

  await ensureStudentRole(user.id);

  // Resolve the seeded course in the DB by slug (its id should match the JSON,
  // but read it back to be safe against id drift).
  const dbCourse = await prisma.lmsCourse.findUnique({
    where: { slug: course.slug },
    select: { id: true, slug: true, title: true },
  });
  if (!dbCourse) {
    console.error(
      `Course "${course.slug}" not found in DB. Run \`npm run db:seed-courses\` before this script.`
    );
    process.exit(1);
  }

  // Find the first lesson of the course so the enrollment points at a resumable
  // lesson (and so the spec can target a real /lessons/<lessonId> route).
  const firstLessonId = course.modules[0]?.lessons[0]?.id ?? null;

  const existingEnrollment = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId: dbCourse.id } },
    select: { id: true },
  });

  if (existingEnrollment) {
    await prisma.lmsEnrollment.update({
      where: { id: existingEnrollment.id },
      data: {
        status: 'active',
        lastAccessedLessonId: firstLessonId,
      },
    });
  } else {
    await prisma.lmsEnrollment.create({
      data: {
        id: E2E_ENROLLMENT_ID,
        studentId: user.id,
        courseId: dbCourse.id,
        status: 'active',
        lastAccessedLessonId: firstLessonId,
      },
    });
  }

  console.log('Seeded E2E user:', E2E_STUDENT.email);
  console.log('Enrolled in course:', dbCourse.slug, `(${dbCourse.id})`);
  console.log('First lesson id:', firstLessonId ?? '(none — lesson test will be skipped)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
