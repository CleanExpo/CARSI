/**
 * Course publish gate (Linear GP-776).
 *
 * Founder rule (Phill, 22/11/2026): no AI-generated course goes live without the required
 * review and approval. AI cannot approve or publish a course, and generated content stays a
 * draft until it is reviewed and approved.
 *
 * A course may move to published only from `in_review`, and only when every check below
 * reports nothing:
 *   evidence    the course's evidence ledger passes the existing checker
 *               (scripts/check-evidence-ledger.mjs) with zero GAP rows, the `--max-gap=0` rule,
 *               and no schema, orphan, founder-only or CUT failure. A course with no ledger is
 *               not checked, so it is blocked.
 *   visuals     the Course Standard section 4.1 rule from scripts/check-course-visuals.mjs (a
 *               cover, plus a raster image and a course diagram in every teaching lesson),
 *               applied to the course as stored in the database, which is what learners see.
 *   compliance  the IICRC banned-phrase scan and the copied-standard-text scan used for course
 *               content (src/lib/course-kit), plus the GP-748 rule: a course that is not on the
 *               IICRC CEC approvals register carries no IICRC or CEC wording at all.
 *   approval    a named admin recorded an approval of exactly the current content
 *               (`courseContentSha256`). Any content change after the approval needs a new one.
 *
 * The ledger and visuals helpers are the CI checks' own exported functions, called here rather
 * than copied. Courses that were already published before this gate stay published; the gate
 * applies to transitions only.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { checkLedger } from '../../../scripts/check-evidence-ledger.mjs';
import {
  isCover,
  isDiagram,
  isLessonImage,
  lessonUrls,
} from '../../../scripts/check-course-visuals.mjs';
import { scanCourseForBannedPhrases, scanCourseForStandardExcerpts } from '@/lib/course-kit/scaffold';
import type { KitCourse } from '@/lib/course-kit/types';
import { getCecApproval } from '@/lib/seed/cec-approvals';

export type PublishGateCheck = 'workflow' | 'evidence' | 'visuals' | 'compliance' | 'approval';

export type PublishBlocker = { check: PublishGateCheck; message: string };

export type PublishGateCourse = {
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  meta?: unknown;
  level?: string | null;
  category?: string | null;
  iicrcDiscipline?: string | null;
  durationHours?: number | null;
  status: string | null;
  isPublished: boolean | null;
  modules: Array<{
    title: string;
    orderIndex: number;
    lessons: Array<{
      id: string;
      title: string;
      contentType: string;
      contentBody: string | null;
      orderIndex: number;
      isPreview: boolean;
      resources: unknown;
    }>;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    passPercentage: number;
    attemptsAllowed: number;
    questions: Array<{
      questionText: string;
      options: unknown;
      correctIndex: number;
      orderIndex: number;
      points: number;
      explanation: string | null;
    }>;
  }>;
};

export type RecordedApproval = {
  contentSha256: string;
  actorEmail: string;
  createdAt: Date;
};

/** Thrown by the admin write paths; the route returns the blockers to the admin UI. */
export class CoursePublishBlockedError extends Error {
  readonly blockers: PublishBlocker[];
  constructor(blockers: PublishBlocker[]) {
    super('COURSE_PUBLISH_BLOCKED');
    this.name = 'CoursePublishBlockedError';
    this.blockers = blockers;
  }
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LEDGER_LOCATIONS = ['v1-draft/evidence', 'v1/evidence', 'evidence'];
// GP-748: a course that is not IICRC CEC approved may carry no IICRC or CEC wording.
const IICRC_OR_CEC_RE = /\bIICRC\b|\bCECs?\b|Continuing Education Credit/i;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, stable((value as Record<string, unknown>)[k])])
    );
  }
  return value ?? null;
}

function metaString(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : null;
}

/**
 * sha256 of everything a learner reads: titles, descriptions, cover, intro video, level,
 * category, discipline, duration, lesson bodies and resources, and quiz questions. Price,
 * publication state and the rest of `meta` are left out, so a price change or a stored
 * optimiser draft is not a content change.
 */
export function courseContentSha256(course: PublishGateCourse): string {
  const content = {
    introVideoUrl: metaString(course.meta, 'introVideoUrl'),
    introThumbnailUrl: metaString(course.meta, 'introThumbnailUrl'),
    title: course.title,
    description: course.description,
    shortDescription: course.shortDescription,
    thumbnailUrl: course.thumbnailUrl,
    level: course.level ?? null,
    category: course.category ?? null,
    iicrcDiscipline: course.iicrcDiscipline ?? null,
    durationHours: course.durationHours ?? null,
    modules: [...course.modules]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((m) => ({
        title: m.title,
        lessons: [...m.lessons]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((l) => ({
            title: l.title,
            contentType: l.contentType,
            contentBody: l.contentBody,
            isPreview: l.isPreview,
            resources: l.resources,
          })),
      })),
    quizzes: [...course.quizzes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((q) => ({
        id: q.id,
        title: q.title,
        passPercentage: q.passPercentage,
        attemptsAllowed: q.attemptsAllowed,
        questions: [...q.questions]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((x) => ({
            questionText: x.questionText,
            options: x.options,
            correctIndex: x.correctIndex,
            points: x.points,
            explanation: x.explanation,
          })),
      })),
  };
  return createHash('sha256').update(JSON.stringify(stable(content))).digest('hex');
}

function sample(items: string[]): string {
  const shown = items.slice(0, 3).join('; ');
  return items.length > 3 ? `${shown}; and ${items.length - 3} more` : shown;
}

function evidenceBlockers(slug: string, root: string): PublishBlocker[] {
  const block = (message: string): PublishBlocker[] => [{ check: 'evidence', message }];
  if (!SLUG_RE.test(slug)) {
    return block(`The course address "${slug}" is not a valid slug, so its evidence ledger cannot be found.`);
  }
  const ledgers = LEDGER_LOCATIONS.map((d) =>
    path.join(root, 'data', 'courses', slug, d, 'evidence-ledger.jsonl')
  ).filter((f) => existsSync(f));
  if (ledgers.length === 0) {
    return block(
      `No evidence ledger was found for this course (data/courses/${slug}/.../evidence-ledger.jsonl). Add the course's evidence ledger and close every GAP row, then try again.`
    );
  }
  const out: PublishBlocker[] = [];
  for (const ledger of ledgers) {
    const rel = path.relative(root, ledger).split(path.sep).join('/');
    let result: ReturnType<typeof checkLedger>;
    try {
      result = checkLedger(ledger);
    } catch (e) {
      out.push({
        check: 'evidence',
        message: `The evidence ledger ${rel} could not be checked (${e instanceof Error ? e.message : String(e)}). Fix the ledger, then try again.`,
      });
      continue;
    }
    if (result.gap > 0) {
      out.push({
        check: 'evidence',
        message: `The evidence ledger ${rel} has ${result.gap} open GAP row${result.gap === 1 ? '' : 's'} (${sample(result.gapIds.map(String))}). Resolve each one to VERIFIED, JUSTIFIED or CUT.`,
      });
    }
    // checkLedger is plain JS; its violation lists are { rule, line, message } objects.
    const failures = [...result.schema, ...result.orphan, ...result.founder, ...result.cut] as Array<{
      message: string;
    }>;
    if (failures.length > 0) {
      out.push({
        check: 'evidence',
        message: `The evidence ledger ${rel} fails ${failures.length} rule check${failures.length === 1 ? '' : 's'} (${sample(failures.map((f) => f.message))}). Run npm run check:evidence-ledger and fix them.`,
      });
    }
  }
  return out;
}

function visualsBlockers(course: PublishGateCourse, root: string): PublishBlocker[] {
  const out: PublishBlocker[] = [];
  if (!isCover(root, course.thumbnailUrl)) {
    out.push({ check: 'visuals', message: 'The course has no cover image. Add one.' });
  }
  const noImage: string[] = [];
  const noDiagram: string[] = [];
  let teaching = 0;
  for (const m of course.modules) {
    for (const l of m.lessons) {
      if (l.contentType === 'quiz') continue;
      teaching += 1;
      const urls = lessonUrls(l) as string[];
      if (!urls.some((u) => isLessonImage(root, u))) noImage.push(l.title);
      if (!urls.some((u) => isDiagram(root, u))) noDiagram.push(l.title);
    }
  }
  if (teaching === 0) {
    out.push({ check: 'visuals', message: 'The course has no teaching lessons, so it cannot be checked. Add its lessons.' });
  }
  if (noImage.length > 0) {
    out.push({
      check: 'visuals',
      message: `${noImage.length} lesson${noImage.length === 1 ? ' has' : 's have'} no lesson image (${sample(noImage)}). Add a raster image to each.`,
    });
  }
  if (noDiagram.length > 0) {
    out.push({
      check: 'visuals',
      message: `${noDiagram.length} lesson${noDiagram.length === 1 ? ' has' : 's have'} no course diagram (${sample(noDiagram)}). Add a /courses/<course>/diagrams/*.svg diagram to each.`,
    });
  }
  return out;
}

function complianceBlockers(course: PublishGateCourse): PublishBlocker[] {
  const kit: KitCourse = {
    slug: course.slug,
    title: course.title,
    modules: [
      {
        title: 'Course details',
        lessons: [
          { id: 'course-description', title: 'Course description', contentBody: course.description },
          { id: 'course-summary', title: 'Course summary', contentBody: course.shortDescription },
        ],
      },
      ...course.modules.map((m) => ({
        title: m.title,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          contentBody: l.contentType === 'quiz' ? null : l.contentBody,
        })),
      })),
    ],
  };
  const out: PublishBlocker[] = [];
  const phrases = scanCourseForBannedPhrases(kit);
  if (phrases.length > 0) {
    out.push({
      check: 'compliance',
      message: `The IICRC wording check found ${phrases.length} problem${phrases.length === 1 ? '' : 's'} (${sample(phrases.map((h) => `${h.where ?? 'course'}: ${h.message}`))}). Reword them.`,
    });
  }
  const excerpts = scanCourseForStandardExcerpts(kit);
  if (excerpts.length > 0) {
    out.push({
      check: 'compliance',
      message: `${excerpts.length} lesson${excerpts.length === 1 ? ' looks' : 's look'} like copied standard text (${sample(excerpts.map((h) => String(h.where ?? 'lesson')))}). Rewrite it in CARSI's own words.`,
    });
  }
  if (!getCecApproval(course.slug)) {
    const texts: Array<[string, string | null]> = [
      ['course title', course.title],
      ['course description', course.description],
      ['course summary', course.shortDescription],
      ...course.modules.flatMap((m) => [
        [`module "${m.title}"`, m.title] as [string, string],
        ...m.lessons.flatMap((l) => [
          [`lesson "${l.title}"`, l.title] as [string, string],
          [`lesson "${l.title}"`, l.contentType === 'quiz' ? null : l.contentBody] as [string, string | null],
        ]),
      ]),
      ...course.quizzes.flatMap((q) =>
        q.questions.flatMap((x) => [
          [`quiz "${q.title}"`, x.questionText] as [string, string],
          [`quiz "${q.title}"`, x.explanation] as [string, string | null],
          [`quiz "${q.title}"`, JSON.stringify(x.options ?? null)] as [string, string],
        ])
      ),
    ];
    const where = [...new Set(texts.filter(([, t]) => t && IICRC_OR_CEC_RE.test(t)).map(([w]) => w))];
    if (course.iicrcDiscipline?.trim()) where.push('its IICRC discipline field');
    if (where.length > 0) {
      out.push({
        check: 'compliance',
        message: `This course is not on the IICRC CEC approvals register, so it may not mention IICRC or CEC, but it does in ${sample(where)}. Remove that wording.`,
      });
    }
  }
  return out;
}

function approvalBlockers(course: PublishGateCourse, approval: RecordedApproval | null): PublishBlocker[] {
  if (!approval) {
    return [
      {
        check: 'approval',
        message: 'No approval is recorded. A named reviewer must read the course and select Approve before it can be published.',
      },
    ];
  }
  if (approval.contentSha256 !== courseContentSha256(course)) {
    return [
      {
        check: 'approval',
        message: `The course content changed after ${approval.actorEmail} approved it on ${approval.createdAt.toISOString().slice(0, 10)}. A reviewer must approve the current version.`,
      },
    ];
  }
  return [];
}

/** Every reason the course cannot be published now. Empty means it may be published. */
export function evaluatePublishGate(
  course: PublishGateCourse,
  approval: RecordedApproval | null,
  root: string = process.cwd()
): PublishBlocker[] {
  const state = (course.status ?? '').toLowerCase();
  const workflow: PublishBlocker[] =
    course.isPublished === true || state === 'published'
      ? [{ check: 'workflow', message: 'The course is already published.' }]
      : state !== 'in_review'
        ? [{ check: 'workflow', message: 'The course is not in review. Select Submit for review first.' }]
        : [];
  return [
    ...workflow,
    ...evidenceBlockers(course.slug, root),
    ...visualsBlockers(course, root),
    ...complianceBlockers(course),
    ...approvalBlockers(course, approval),
  ];
}
