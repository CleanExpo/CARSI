/**
 * Strip Wikipedia Signs of AI writing from learner-facing LMS rows.
 * https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
 *
 *   npm run db:strip-ai-writing
 *   npm run db:strip-ai-writing -- --dry-run
 *   npm run db:strip-ai-writing -- --slug=introduction-to-restoration-of-antiques-and-fine-furnishings
 */
import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import { prisma } from '@/lib/prisma';
import { stripAiWritingFromUnknown, stripAiWritingSigns } from '@/lib/lms/strip-ai-writing-signs';
import { sanitizeLearnerContent } from '@/lib/seed/sanitize-learner-content';

function cleanText(raw: string | null | undefined): string | null {
  if (raw == null) return raw ?? null;
  const stripped = stripAiWritingSigns(raw);
  return sanitizeLearnerContent(stripped);
}

function same(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '') === (b ?? '');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const slugArg = process.argv.find((a) => a.startsWith('--slug='))?.slice('--slug='.length);

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const courseWhere = slugArg ? { slug: slugArg } : undefined;
  const courses = await prisma.lmsCourse.findMany({
    where: courseWhere,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      shortDescription: true,
      meta: true,
    },
  });

  if (slugArg && courses.length === 0) {
    console.error(`No course with slug ${slugArg}.`);
    process.exit(1);
  }

  let courseUpdates = 0;
  let moduleUpdates = 0;
  let lessonUpdates = 0;
  let quizUpdates = 0;
  let questionUpdates = 0;
  let assessmentUpdates = 0;

  for (const course of courses) {
    const data: {
      title?: string;
      description?: string | null;
      shortDescription?: string | null;
      meta?: object;
    } = {};

    const title = cleanText(course.title);
    if (title && !same(title, course.title)) data.title = title;

    const description = cleanText(course.description);
    if (!same(description, course.description)) data.description = description;

    const shortDescription = cleanText(course.shortDescription);
    if (!same(shortDescription, course.shortDescription)) data.shortDescription = shortDescription;

    if (course.meta != null) {
      const meta = stripAiWritingFromUnknown(course.meta);
      if (JSON.stringify(meta) !== JSON.stringify(course.meta)) {
        data.meta = meta as object;
      }
    }

    if (Object.keys(data).length > 0) {
      courseUpdates += 1;
      console.log(`Course ${course.slug}`);
      if (!dryRun) {
        await prisma.lmsCourse.update({ where: { id: course.id }, data });
      }
    }

    const modules = await prisma.lmsModule.findMany({
      where: { courseId: course.id },
      select: { id: true, title: true },
    });
    for (const mod of modules) {
      const nextTitle = cleanText(mod.title);
      if (nextTitle && !same(nextTitle, mod.title)) {
        moduleUpdates += 1;
        if (!dryRun) {
          await prisma.lmsModule.update({ where: { id: mod.id }, data: { title: nextTitle } });
        }
      }

      const lessons = await prisma.lmsLesson.findMany({
        where: { moduleId: mod.id },
        select: { id: true, title: true, contentBody: true, resources: true },
      });
      for (const lesson of lessons) {
        const next: { title?: string; contentBody?: string | null; resources?: object } = {};
        const lTitle = cleanText(lesson.title);
        if (lTitle && !same(lTitle, lesson.title)) next.title = lTitle;
        const body = cleanText(lesson.contentBody);
        if (!same(body, lesson.contentBody)) next.contentBody = body;
        if (lesson.resources != null) {
          const resources = stripAiWritingFromUnknown(lesson.resources);
          if (JSON.stringify(resources) !== JSON.stringify(lesson.resources)) {
            next.resources = resources as object;
          }
        }
        if (Object.keys(next).length > 0) {
          lessonUpdates += 1;
          console.log(`  Lesson: ${lesson.title}`);
          if (!dryRun) {
            await prisma.lmsLesson.update({ where: { id: lesson.id }, data: next });
          }
        }
      }
    }

    const quizzes = await prisma.lmsQuiz.findMany({
      where: { courseId: course.id },
      select: { id: true, title: true },
    });
    for (const quiz of quizzes) {
      const qTitle = cleanText(quiz.title);
      if (qTitle && !same(qTitle, quiz.title)) {
        quizUpdates += 1;
        if (!dryRun) {
          await prisma.lmsQuiz.update({ where: { id: quiz.id }, data: { title: qTitle } });
        }
      }
      const questions = await prisma.lmsQuizQuestion.findMany({
        where: { quizId: quiz.id },
        select: { id: true, questionText: true, options: true },
      });
      for (const q of questions) {
        const next: { questionText?: string; options?: object } = {};
        const qt = cleanText(q.questionText);
        if (qt && !same(qt, q.questionText)) next.questionText = qt;
        if (q.options != null) {
          const options = stripAiWritingFromUnknown(q.options);
          if (JSON.stringify(options) !== JSON.stringify(q.options)) {
            next.options = options as object;
          }
        }
        if (Object.keys(next).length > 0) {
          questionUpdates += 1;
          if (!dryRun) {
            await prisma.lmsQuizQuestion.update({ where: { id: q.id }, data: next });
          }
        }
      }
    }

    const assessments = await prisma.lmsPracticalAssessment.findMany({
      where: { courseId: course.id },
      select: { id: true, title: true, instructions: true },
    });
    for (const a of assessments) {
      const next: { title?: string; instructions?: string } = {};
      const aTitle = cleanText(a.title);
      if (aTitle && !same(aTitle, a.title)) next.title = aTitle;
      const instructions = cleanText(a.instructions);
      if (instructions && !same(instructions, a.instructions)) next.instructions = instructions;
      if (Object.keys(next).length > 0) {
        assessmentUpdates += 1;
        if (!dryRun) {
          await prisma.lmsPracticalAssessment.update({ where: { id: a.id }, data: next });
        }
      }
    }
  }

  const summary =
    `${courseUpdates} course(s), ${moduleUpdates} module(s), ${lessonUpdates} lesson(s), ` +
    `${quizUpdates} quiz(zes), ${questionUpdates} question(s), ${assessmentUpdates} assessment(s)`;
  console.log(dryRun ? `Dry run — would update ${summary}.` : `Updated ${summary}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
