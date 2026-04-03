import { normalizePublicAssetUrl } from '@/lib/remote-image';
import { prisma } from '@/lib/prisma';

/** Client / API shape for `EnrolledCourseList` and enrollments/me. */
export interface EnrollmentDto {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  status: string;
  enrolled_at: string;
  completion_percentage: number;
  thumbnail_url?: string | null;
  last_lesson_id?: string | null;
  last_lesson_title?: string | null;
  all_lessons_complete?: boolean;
  certificate_issued_at?: string | null;
}

export interface LearnerDashboardSummary {
  enrollments: EnrollmentDto[];
  counts: {
    total: number;
    active: number;
    completed: number;
  };
  /** Sum of `cecHours` on courses the learner has completed (when set on course rows). */
  cecHoursFromCompleted: number;
  /** Sum of `durationHours` across all enrolled courses (catalog metadata). */
  totalCatalogHours: number;
}

function normalizeStatus(raw: string): 'completed' | 'active' | 'other' {
  const s = raw.toLowerCase().trim();
  if (s === 'completed' || s === 'complete') return 'completed';
  if (
    s === 'active' ||
    s === 'enrolled' ||
    s === 'in_progress' ||
    s === 'in progress' ||
    s === 'started'
  ) {
    return 'active';
  }
  return 'other';
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const n = Number(String((v as { toString: () => string }).toString()));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapEnrollmentRow(
  e: {
    id: string;
    studentId: string;
    courseId: string;
    status: string;
    enrolledAt: Date;
    lastAccessedLessonId: string | null;
    completedAt: Date | null;
    certificateIssuedAt: Date | null;
    course: {
      title: string;
      slug: string;
      thumbnailUrl: string | null;
      cecHours: unknown;
      durationHours: unknown;
      modules: { lessons: { id: string; title: string }[] }[];
    };
  },
  progressByLesson: Map<string, { completed: boolean }>
): EnrollmentDto {
  const lessonIds: string[] = [];
  const lessonTitleById = new Map<string, string>();
  for (const m of e.course.modules) {
    for (const l of m.lessons) {
      lessonIds.push(l.id);
      lessonTitleById.set(l.id, l.title);
    }
  }

  const total = lessonIds.length;
  let completed = 0;
  for (const id of lessonIds) {
    if (progressByLesson.get(id)?.completed === true) completed += 1;
  }

  const allLessonsComplete = total > 0 && completed >= total;
  const completionPercentage =
    total === 0
      ? normalizeStatus(e.status) === 'completed'
        ? 100
        : 0
      : Math.min(100, Math.round((completed / total) * 100));

  const lastId = e.lastAccessedLessonId;
  const lastTitle = lastId ? lessonTitleById.get(lastId) ?? null : null;

  return {
    id: e.id,
    course_id: e.courseId,
    course_title: e.course.title,
    course_slug: e.course.slug,
    status: allLessonsComplete ? 'completed' : e.status,
    enrolled_at: e.enrolledAt.toISOString(),
    completion_percentage: allLessonsComplete ? 100 : completionPercentage,
    thumbnail_url: normalizePublicAssetUrl(e.course.thumbnailUrl),
    last_lesson_id: lastId,
    last_lesson_title: lastTitle,
    all_lessons_complete: allLessonsComplete,
    certificate_issued_at: e.certificateIssuedAt?.toISOString() ?? null,
  };
}

export async function getEnrollmentsForStudent(userId: string): Promise<EnrollmentDto[]> {
  const summary = await getLearnerDashboardSummary(userId);
  return summary?.enrollments ?? [];
}

export async function getLearnerDashboardSummary(
  userId: string
): Promise<LearnerDashboardSummary | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }

  try {
    const rows = await prisma.lmsEnrollment.findMany({
      where: { studentId: userId },
      include: {
        course: {
          select: {
            title: true,
            slug: true,
            cecHours: true,
            durationHours: true,
            thumbnailUrl: true,
            modules: {
              select: {
                lessons: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const allLessonIds = rows.flatMap((e) =>
      e.course.modules.flatMap((m) => m.lessons.map((l) => l.id))
    );

    const progressRows =
      allLessonIds.length === 0
        ? []
        : await prisma.lmsLessonProgress.findMany({
            where: { studentId: userId, lessonId: { in: allLessonIds } },
            select: { lessonId: true, completed: true },
          });

    const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

    const enrollments = rows.map((r) => mapEnrollmentRow(r, progressByLesson));

    let active = 0;
    let completed = 0;
    let cecHoursFromCompleted = 0;
    let totalCatalogHours = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const dto = enrollments[i];
      if (dto.all_lessons_complete || normalizeStatus(dto.status) === 'completed') {
        completed += 1;
        const cec = toNumber(r.course.cecHours);
        if (cec !== null) cecHoursFromCompleted += cec;
      } else if (normalizeStatus(dto.status) === 'active') {
        active += 1;
      }
      const dur = toNumber(r.course.durationHours);
      if (dur !== null) totalCatalogHours += dur;
    }

    return {
      enrollments,
      counts: {
        total: rows.length,
        active,
        completed,
      },
      cecHoursFromCompleted,
      totalCatalogHours,
    };
  } catch (err) {
    console.error('[learner-dashboard-data]', err);
    return null;
  }
}
