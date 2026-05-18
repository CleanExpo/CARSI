import { sendEmail } from '@/lib/server/email';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { prisma } from '@/lib/prisma';

export async function sendEnrollmentWelcomeEmail(params: {
  studentId: string;
  courseSlug: string;
  origin: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { studentId, courseSlug, origin } = params;
  const user = await prisma.lmsUser.findUnique({
    where: { id: studentId },
    select: { email: true, fullName: true },
  });
  const course = await prisma.lmsCourse.findUnique({
    where: { slug: courseSlug.trim().toLowerCase() },
    select: { title: true },
  });
  if (!user?.email || !course) return { sent: false, reason: 'missing_user_or_course' };

  const base = origin.replace(/\/$/, '');
  const learnPath = (await getFirstLessonLearnPath(courseSlug)) ?? '/dashboard/student';
  const startUrl = `${base}${learnPath}`;

  const name = user.fullName?.trim() || user.email.split('@')[0];

  return sendEmail({
    to: user.email,
    subject: `You're enrolled — ${course.title}`,
    html: `
      <p>Hi ${name},</p>
      <p>Your enrolment in <strong>${course.title}</strong> is confirmed.</p>
      <p><a href="${startUrl}">Start lesson 1 now</a></p>
      <p>Or open <a href="${base}/dashboard/student">My Learning</a> anytime.</p>
      <p>— CARSI Learning</p>
    `,
    text: `Hi ${name}, you're enrolled in ${course.title}. Start here: ${startUrl}`,
  });
}
