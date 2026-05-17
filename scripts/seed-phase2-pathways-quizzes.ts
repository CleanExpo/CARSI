/**
 * Links published pathways to courses by iicrc_discipline and seeds a sample quiz
 * on the first published course in each linked pathway.
 *
 * Usage: npx tsx scripts/seed-phase2-pathways-quizzes.ts
 */
import { prisma } from '../src/lib/prisma';

const SAMPLE_QUESTIONS = [
  {
    questionText: 'What does WRT stand for in IICRC certification?',
    options: ['Water Restoration Technician', 'Wall Repair Technician', 'Wet Room Technician'],
    correctIndex: 0,
  },
  {
    questionText: 'Before starting remediation, what should always be documented?',
    options: ['Only final invoice', 'Scope, moisture readings, and photos', 'Social media posts'],
    correctIndex: 1,
  },
];

async function main() {
  const pathways = await prisma.lmsLearningPathway.findMany({
    where: { isPublished: true },
  });

  for (const pathway of pathways) {
    if (!pathway.iicrcDiscipline) continue;

    const courses = await prisma.lmsCourse.findMany({
      where: {
        isPublished: true,
        iicrcDiscipline: pathway.iicrcDiscipline,
      },
      orderBy: { title: 'asc' },
      take: 8,
      select: { id: true },
    });

    let order = 0;
    for (const course of courses) {
      await prisma.lmsLearningPathwayCourse.upsert({
        where: {
          pathwayId_courseId: { pathwayId: pathway.id, courseId: course.id },
        },
        create: { pathwayId: pathway.id, courseId: course.id, orderIndex: order },
        update: { orderIndex: order },
      });
      order += 1;
    }

    const firstCourseId = courses[0]?.id;
    if (!firstCourseId) continue;

    const existingQuiz = await prisma.lmsQuiz.findFirst({
      where: { courseId: firstCourseId },
    });
    if (existingQuiz) continue;

    const quiz = await prisma.lmsQuiz.create({
      data: {
        courseId: firstCourseId,
        title: `${pathway.title} — knowledge check`,
        passPercentage: 70,
        attemptsAllowed: 3,
      },
    });

    for (let i = 0; i < SAMPLE_QUESTIONS.length; i += 1) {
      const q = SAMPLE_QUESTIONS[i];
      await prisma.lmsQuizQuestion.create({
        data: {
          quizId: quiz.id,
          questionText: q.questionText,
          options: q.options.map((text) => ({ text })),
          correctIndex: q.correctIndex,
          orderIndex: i,
        },
      });
    }

    const module = await prisma.lmsModule.findFirst({
      where: { courseId: firstCourseId },
      orderBy: { orderIndex: 'asc' },
    });
    if (!module) continue;

    const maxOrder = await prisma.lmsLesson.aggregate({
      where: { moduleId: module.id },
      _max: { orderIndex: true },
    });
    const nextOrder = (maxOrder._max.orderIndex ?? 0) + 1;

    await prisma.lmsLesson.create({
      data: {
        id: crypto.randomUUID(),
        moduleId: module.id,
        title: 'Knowledge check',
        contentType: 'quiz',
        contentBody: quiz.id,
        orderIndex: nextOrder,
        isPreview: false,
        resources: [{ label: 'Quiz', url: `quiz:${quiz.id}` }],
      },
    });
  }

  console.log('Phase 2 pathway links and sample quizzes seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
