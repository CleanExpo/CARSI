import { prisma } from '@/lib/prisma';
import { emitCrmEvent } from '@/lib/server/crm-sync';

/** Fire-and-forget CRM enrollment event when DB is available. */
export function notifyCrmEnrollmentCreated(params: {
  enrollmentId: string;
  studentId: string;
  courseId: string;
}): void {
  if (!process.env.DATABASE_URL?.trim()) return;

  void (async () => {
    const [student, course] = await Promise.all([
      prisma.lmsUser.findUnique({
        where: { id: params.studentId },
        select: { email: true },
      }),
      prisma.lmsCourse.findUnique({
        where: { id: params.courseId },
        select: { title: true, slug: true },
      }),
    ]);

    if (!student || !course) return;

    await emitCrmEvent('enrollment.created', {
      enrollment_id: params.enrollmentId,
      student_id: params.studentId,
      student_email: student.email,
      course_id: params.courseId,
      course_title: course.title,
      course_slug: course.slug,
      status: 'active',
    });
  })().catch((e) => console.error('[crm] enrollment', e));
}
