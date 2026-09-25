import { randomUUID } from 'node:crypto';

import { Prisma } from '@/generated/prisma/client';

import {
  adminGetCourse,
  adminUpdateCourse,
  courseToAdminDto,
} from '@/lib/admin/admin-courses-service';
import type { OptimizedCourseDraft, OptimizedModuleDraft } from '@/lib/admin/optimize-course-draft';
import {
  CourseBuilderInputError,
  assertNoStandardText,
} from '@/lib/course-kit/ai-course-builder-guard';
import { scanManyForStandardExcerpts } from '@/lib/course-kit/standards-excerpt';
import { prisma } from '@/lib/prisma';

import { AnthropicAPIError, anthropicComplete, resolveAnthropicConfig } from './anthropic-client';

export type { OptimizedCourseDraft, OptimizedModuleDraft };

export class OptimizeCourseError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OptimizeCourseError';
    this.status = status;
  }
}

const META_KEY = 'optimizeDraft';
export const OPTIMIZE_APPLIED_META_KEY = 'optimizeAppliedAt';
export const OPTIMIZE_BEFORE_META_KEY = 'optimizeBefore';
const MIN_MODULES = 7;
const MAX_MODULES = 24;
export const RECAP_MODULE_TITLE = 'What you learnt';
const MAX_MODULE_SOURCE_CHARS = 4_500;
const MAX_TOTAL_SOURCE_CHARS = 22_000;
const BANNED_AI_PHRASES = [
  /\bin today'?s (?:world|fast-paced)\b/gi,
  /\bit is important to note\b/gi,
  /\bit should be noted\b/gi,
  /\bin conclusion\b/gi,
  /\bto summarise\b/gi,
  /\bto summarize\b/gi,
  /\bdelve into\b/gi,
  /\bnestled\b/gi,
  /\btapestry\b/gi,
  /\blandscape of\b/gi,
  /\bleverage\b/gi,
  /\butilis(?:e|ing)\b/gi,
  /\butilize\b/gi,
  /\bcomprehensive\b/gi,
  /\brobust\b/gi,
  /\bcutting-edge\b/gi,
  /\bgame-?changer\b/gi,
  /\bunlock your potential\b/gi,
  /\bin this module,? we will\b/gi,
  /\bthis module (?:will|aims to)\b/gi,
  /\bat the end of the day\b/gi,
  /\bwhen it comes to\b/gi,
  /\bas we (?:explore|journey|navigate)\b/gi,
  /\blet's dive in\b/gi,
  /\bplay a (?:crucial|vital|key) role\b/gi,
  /\bin order to\b/gi,
];

const SYSTEM_PROMPT = `You rewrite CARSI restoration-industry training for technicians working in Australia.

Voice: an experienced restoration specialist who has actually done the work: owner-operator, job-site, insurance, customers, equipment, safety. Natural, practical, occasionally conversational. Not academic. Not corporate. Not generic AI.

Write Australian English (colour, odour, metre, licence, practise, -ise). Power and electrical context is 230 V / 50 Hz, 10 A GPO, RCD/safety switch, AS/NZS. Metric units. AUD if money is mentioned.

Rules you must follow:
- Use the supplied course as the only factual foundation. Expand explanation and practical application. Do not invent personal stories, certifications, qualifications, statistics, CEC hours, IICRC approvals, or claims that are not in the source.
- You may write in a field-tech voice. Do not claim to be Phill McGurk or invent his (or anyone's) credentials.
- Keep the course title, learning intent, discipline, and audience unchanged.
- Keep existing module titles. Expand to the asked module count. The last module is always the recap.
- Paying customers need usable training, not a wall of theory. Each module must include: a realistic job-site scenario, at least one short quotation of what a customer, assessor or tech would actually say, and a practical example of how to handle it. Do not invent named people, certifications, statistics or standards. Typical dialogue is fine if it is clearly an example.
- Never paste IICRC standard sections, tables, or procedures. Nominative mention only (e.g. "aligned to ANSI/IICRC S500") if the source already does that.
- Never imply CARSI delivers IICRC certification or IICRC courses. If CEC is not in the source, do not add CEC hours.
- Do not brand the course with IICRC discipline acronyms (WRT, ASD, AMRT, FSRT, CCT, TCST).
- Do not use em dashes or en dashes. Use a comma, a full stop, or a hyphen.
- Avoid filler, stacked headings, and these phrases: "in today's world", "it is important to note", "in conclusion", "comprehensive", "delve into", "leverage", "robust", "cutting-edge", "unlock your potential", "when it comes to", "play a crucial role".
- When asked for a single module body, return the instructional text only. Do not wrap it in JSON or markdown fences.`;

export function htmlToPlain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function repairJson(s: string): string {
  return s
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new OptimizeCourseError('Model returned no JSON object', 502);
  }
  const slice = repairJson(candidate.slice(start, end + 1));
  try {
    return JSON.parse(slice);
  } catch {
    throw new OptimizeCourseError('Model returned invalid JSON', 502);
  }
}

/** Prefer JSON when it parses; otherwise take the plain body (or a truncated textContent string). */
export function extractModuleBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new OptimizeCourseError('Model returned empty module text', 502);
  }

  try {
    const obj = extractJsonObject(trimmed) as {
      textContent?: unknown;
      content?: unknown;
      modules?: Array<{ textContent?: unknown }>;
    };
    const fromRoot =
      typeof obj.textContent === 'string'
        ? obj.textContent
        : typeof obj.content === 'string'
          ? obj.content
          : null;
    const fromList =
      Array.isArray(obj.modules) && typeof obj.modules[0]?.textContent === 'string'
        ? obj.modules[0].textContent
        : null;
    const picked = (fromRoot ?? fromList ?? '').trim();
    if (picked.length >= 80) return scrubAiPhrases(picked);
  } catch {
    /* not valid JSON — use text / salvage */
  }

  const salvage = trimmed.match(/"textContent"\s*:\s*"([\s\S]+)/);
  if (salvage?.[1]) {
    const salvaged = unescapeJsonString(salvage[1].replace(/"\s*,?\s*\]?\s*}?\s*$/, '')).trim();
    if (salvaged.length >= 80) return scrubAiPhrases(salvaged);
  }

  const unfenced = trimmed
    .replace(/^```(?:json|markdown|text)?\s*/i, '')
    .replace(/```$/u, '')
    .trim();
  if (unfenced.length >= 80) return scrubAiPhrases(unfenced);

  throw new OptimizeCourseError('Model returned empty module text', 502);
}

export function scrubAiWriting(text: string): string {
  let out = text
    .replace(/&mdash;|&#8212;|\u2014/g, ', ')
    .replace(/&ndash;|&#8211;|\u2013/g, '-')
    .replace(/\s+-\s+/g, ', ')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, '...');
  for (const re of BANNED_AI_PHRASES) {
    out = out.replace(re, '');
  }
  return out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function scrubAiPhrases(text: string): string {
  return scrubAiWriting(text);
}

export function countParagraphs(text: string): number {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40).length;
}

export function ensureModuleParagraphs(text: string): string {
  const cleaned = scrubAiPhrases(text);
  if (countParagraphs(cleaned) >= 3) return cleaned;
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  if (sentences.length < 6) return cleaned;
  const size = Math.max(2, Math.ceil(sentences.length / 4));
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length && chunks.length < 4; i += size) {
    chunks.push(sentences.slice(i, i + size).join(' '));
  }
  return chunks.join('\n\n');
}

/** Higher AUD price buys a denser course. */
export function targetModuleCount(existingCount: number, priceAud = 0): number {
  const paidWell = priceAud >= 199;
  const premium = priceAud >= 399;

  if (existingCount >= 10) {
    const floor = premium ? 18 : paidWell ? 16 : 15;
    return Math.min(MAX_MODULES, Math.max(floor, existingCount + 5));
  }
  if (existingCount === 8 || existingCount === 9) return 10;
  if (existingCount <= 5) return paidWell ? 9 : 8;
  return paidWell ? 10 : 9;
}

export function parseTitleList(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*(?:[-*]|\d+[.)])\s*/, '')
        .replace(/^#{1,3}\s*/, '')
        .trim()
    )
    .filter((line) => line.length >= 4 && line.length <= 180 && !line.startsWith('{'));
}

export function isRecapModuleTitle(title: string): boolean {
  return /\bwhat you learn|\brecap\b|\bkey takeaways?\b/i.test(title);
}

export function planModuleTitles(
  existingTitles: string[],
  suggested: string[],
  priceAud = 0
): string[] {
  const target = targetModuleCount(existingTitles.length, priceAud);
  const bodyTarget = Math.max(MIN_MODULES - 1, target - 1);
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (title: string) => {
    const t = title.trim().slice(0, 180);
    const key = t.toLowerCase();
    if (!t || seen.has(key) || isRecapModuleTitle(t) || out.length >= bodyTarget) return;
    seen.add(key);
    out.push(t);
  };
  existingTitles.forEach(add);
  suggested.forEach(add);
  let n = 1;
  while (out.length < bodyTarget) {
    add(`On-the-job application ${n}`);
    n += 1;
  }
  const existingRecap = existingTitles.find(isRecapModuleTitle);
  out.push(existingRecap?.trim() || RECAP_MODULE_TITLE);
  return out.slice(0, MAX_MODULES);
}

export function parseOptimizedModules(
  raw: unknown,
  opts?: { expectedCount?: number }
): OptimizedModuleDraft[] {
  if (!raw || typeof raw !== 'object') {
    throw new OptimizeCourseError('Draft is missing modules', 502);
  }
  const modules = (raw as { modules?: unknown }).modules;
  if (!Array.isArray(modules)) {
    throw new OptimizeCourseError('Draft modules must be an array', 502);
  }
  const out: OptimizedModuleDraft[] = [];
  for (const row of modules) {
    if (!row || typeof row !== 'object') continue;
    const m = row as Record<string, unknown>;
    const title = typeof m.title === 'string' ? m.title.trim() : '';
    const textContent =
      typeof m.textContent === 'string' ? ensureModuleParagraphs(m.textContent.trim()) : '';
    if (!title || textContent.length < 200) continue;
    out.push({ title: title.slice(0, 180), textContent });
  }
  const needed = opts?.expectedCount ?? MIN_MODULES;
  if (out.length < needed) {
    throw new OptimizeCourseError(
      `Optimisation produced ${out.length} usable modules; expected ${needed}`,
      502
    );
  }
  return out.slice(0, MAX_MODULES);
}

function readDraftModules(raw: unknown): OptimizedModuleDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: OptimizedModuleDraft[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const m = row as Record<string, unknown>;
    const title = typeof m.title === 'string' ? m.title.trim() : '';
    const textContent = typeof m.textContent === 'string' ? m.textContent.trim() : '';
    if (title && textContent) out.push({ title: title.slice(0, 180), textContent });
  }
  return out;
}

export function draftFromApplyBody(body: unknown): OptimizedCourseDraft | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const o = body as Record<string, unknown>;
  const token = typeof o.token === 'string' ? o.token.trim() : '';
  const modules = readDraftModules(o.modules);
  if (modules.length === 0) return null;
  return {
    token: token || 'client',
    generatedAt: typeof o.generatedAt === 'string' ? o.generatedAt : new Date().toISOString(),
    title: typeof o.title === 'string' ? o.title : '',
    description: typeof o.description === 'string' ? o.description : '',
    modules,
  };
}

export function readOptimizeDraft(meta: unknown): OptimizedCourseDraft | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const raw = (meta as Record<string, unknown>)[META_KEY];
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.token !== 'string' || typeof d.generatedAt !== 'string') return null;
  if (typeof d.title !== 'string') return null;
  const modules = readDraftModules(d.modules);
  if (modules.length === 0) return null;
  return {
    token: d.token,
    generatedAt: d.generatedAt,
    title: d.title,
    description: typeof d.description === 'string' ? d.description : '',
    modules,
  };
}

export function hasOptimizeApplied(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false;
  return typeof (meta as Record<string, unknown>)[OPTIMIZE_APPLIED_META_KEY] === 'string';
}

export function readOptimizeAppliedAt(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>)[OPTIMIZE_APPLIED_META_KEY];
  return typeof v === 'string' && v.trim() ? v : null;
}

function appliedAtNeedsOptimize(updatedAt: Date, meta: unknown): boolean {
  const applied = readOptimizeAppliedAt(meta);
  if (!applied) return true;
  const appliedMs = Date.parse(applied);
  if (!Number.isFinite(appliedMs)) return true;
  return updatedAt.getTime() > appliedMs + 3_000;
}

/** Paid courses only. Re-run only when never applied, or the course was edited after apply. */
export function paidCourseNeedsOptimize(input: {
  isFree: boolean;
  updatedAt: Date;
  meta: unknown;
}): boolean {
  if (input.isFree) return false;
  return appliedAtNeedsOptimize(input.updatedAt, input.meta);
}

/** Free courses only. Same apply-once / edited-after-apply rule as paid. */
export function freeCourseNeedsOptimize(input: {
  isFree: boolean;
  updatedAt: Date;
  meta: unknown;
}): boolean {
  if (!input.isFree) return false;
  return appliedAtNeedsOptimize(input.updatedAt, input.meta);
}

export async function snapshotCourseBeforeOptimize(
  courseId: string,
  existingMeta: unknown,
  modules: Array<{ title: string; textContent: string }>
): Promise<void> {
  const next = metaObject(existingMeta);
  next[OPTIMIZE_BEFORE_META_KEY] = {
    snapshotAt: new Date().toISOString(),
    moduleCount: modules.length,
    modules: modules.map((m) => ({
      title: m.title,
      textContent: m.textContent.slice(0, 8_000),
    })),
  };
  await prisma.lmsCourse.update({
    where: { id: courseId },
    data: { meta: JSON.parse(JSON.stringify(next)) as Prisma.InputJsonValue },
  });
}

function metaObject(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return { ...(meta as Record<string, unknown>) };
  }
  return {};
}

export async function persistOptimizeDraft(
  courseId: string,
  existingMeta: unknown,
  draft: OptimizedCourseDraft
): Promise<void> {
  const next = metaObject(existingMeta);
  next[META_KEY] = JSON.parse(JSON.stringify(draft)) as OptimizedCourseDraft;
  await prisma.lmsCourse.update({
    where: { id: courseId },
    data: { meta: next as Prisma.InputJsonValue },
  });
}

export async function discardOptimizeDraft(courseId: string, existingMeta: unknown): Promise<void> {
  const next = metaObject(existingMeta);
  delete next[META_KEY];
  await prisma.lmsCourse.update({
    where: { id: courseId },
    data: { meta: Object.keys(next).length ? (next as Prisma.InputJsonValue) : Prisma.DbNull },
  });
}

function foundationFromCourse(dto: ReturnType<typeof courseToAdminDto>): string {
  const parts: string[] = [];
  parts.push(`Title: ${dto.title}`);
  if (dto.description)
    parts.push(`Description / learning intent:\n${htmlToPlain(dto.description)}`);
  if (dto.category) parts.push(`Category / discipline label: ${dto.category}`);
  if (dto.level) parts.push(`Intended audience / level: ${dto.level}`);
  if (dto.iicrcDiscipline) parts.push(`Stored discipline field: ${dto.iicrcDiscipline}`);
  parts.push('Existing modules (foundation — preserve subject and important facts):');

  let used = parts.join('\n\n').length;
  dto.modules.forEach((mod, i) => {
    const body = htmlToPlain(mod.textContent).slice(0, MAX_MODULE_SOURCE_CHARS);
    const block = '\nModule ' + (i + 1) + ': ' + mod.title + '\n' + (body || '(no text yet)');
    if (used + block.length > MAX_TOTAL_SOURCE_CHARS) {
      parts.push(
        '\nModule ' +
          (i + 1) +
          ': ' +
          mod.title +
          '\n(truncated, title only to stay within size limits)'
      );
      return;
    }
    parts.push(block);
    used += block.length;
  });
  return parts.join('\n\n');
}

export type OptimizeProgress = { step: string; message: string; percent: number };

export async function generateOptimizedCourseDraft(
  courseId: string,
  onProgress?: (p: OptimizeProgress) => void
): Promise<OptimizedCourseDraft> {
  if (!resolveAnthropicConfig().configured) {
    throw new OptimizeCourseError('ANTHROPIC_API_KEY is not configured', 503);
  }

  const course = await adminGetCourse(courseId);
  if (!course) throw new OptimizeCourseError('Not found', 404);
  const dto = courseToAdminDto(course);

  onProgress?.({ step: 'scan', message: 'Preparing existing content…', percent: 10 });

  const fields = [
    { text: dto.title, where: 'title' },
    { text: dto.description, where: 'description' },
    ...dto.modules.map((m, i) => ({
      text: htmlToPlain(m.textContent).slice(0, MAX_MODULE_SOURCE_CHARS),
      where: `module ${i + 1}`,
    })),
  ];
  try {
    assertNoStandardText(fields);
  } catch (e) {
    if (e instanceof CourseBuilderInputError) {
      throw new OptimizeCourseError(e.message, 400);
    }
    throw e;
  }

  const foundation = foundationFromCourse(dto);
  const existingTitles = dto.modules.map((m) => m.title);
  const target = targetModuleCount(existingTitles.length, dto.priceAud);

  onProgress?.({ step: 'outline', message: `Planning ${target} modules…`, percent: 16 });
  let suggested: string[] = [];
  if (existingTitles.length < target) {
    const existingList = existingTitles.map((t, i) => i + 1 + '. ' + t).join('\n') || '(none)';
    const extraCount = target - existingTitles.length;
    const outlineRaw = await anthropicComplete({
      system: SYSTEM_PROMPT,
      maxTokens: 800,
      timeoutMs: 60_000,
      user: [
        'List ' +
          target +
          ' module titles for this course. Keep every existing title unchanged and in the same order. Add ' +
          extraCount +
          ' extra titles on the same subject. The last title must be exactly "' +
          RECAP_MODULE_TITLE +
          '".',
        '',
        'Existing titles:',
        existingList,
        '',
        foundation,
        '',
        'Return a numbered list of titles only. No JSON.',
      ].join('\n'),
    });
    suggested = parseTitleList(outlineRaw);
  }
  const planned = planModuleTitles(existingTitles, suggested, dto.priceAud);

  const written: OptimizedModuleDraft[] = [];
  for (let i = 0; i < planned.length; i += 1) {
    const title = planned[i];
    onProgress?.({
      step: 'write',
      message: `Writing module ${i + 1} of ${planned.length}…`,
      percent: 20 + Math.round((i / planned.length) * 70),
    });

    const existingBody = htmlToPlain(dto.modules[i]?.textContent ?? '').slice(
      0,
      MAX_MODULE_SOURCE_CHARS
    );

    const isRecap = i === planned.length - 1;
    let textContent = '';
    for (let attempt = 0; attempt < 2 && countParagraphs(textContent) < 3; attempt += 1) {
      const raw = await anthropicComplete({
        system: SYSTEM_PROMPT,
        maxTokens: 4096,
        timeoutMs: 120_000,
        user: isRecap
          ? [
              'Course: ' + dto.title,
              'This is the LAST module. Title: ' + RECAP_MODULE_TITLE,
              '',
              'It is a recap of what the learner should now be able to do. Cover the earlier modules only. Do not introduce a new topic or invent facts.',
              '',
              'Earlier modules:',
              planned
                .slice(0, -1)
                .map((t, n) => n + 1 + '. ' + t)
                .join('\n'),
              '',
              foundation,
              '',
              'Write 3-4 substantial paragraphs: what they learnt, a job they should now handle, a short example quotation from a customer or assessor, common mistakes, and what to check before they leave site.',
              'Return the body as plain text. No JSON. No title line. No markdown fences.',
            ].join('\n')
          : [
              'Course: ' + dto.title,
              'Module ' + (i + 1) + ' of ' + planned.length + ': ' + title,
              '',
              existingBody ? 'Existing module text (keep the facts):\n' + existingBody : foundation,
              '',
              'Write 3-4 substantial paragraphs a paying technician can use on the next job.',
              'Include a realistic scenario, at least one short quotation (customer, insurer or tech), and a practical example of what to do. Stay on the source facts. No invented stats, names of real people, or standards text.',
              'Return the body as plain text. No JSON. No title line. No markdown fences.',
            ].join('\n'),
      });
      try {
        textContent = ensureModuleParagraphs(extractModuleBody(raw));
      } catch (e) {
        if (attempt === 1) throw e;
      }
    }

    written.push({ title: isRecap ? RECAP_MODULE_TITLE : title, textContent });
  }

  const modules = parseOptimizedModules({ modules: written }, { expectedCount: MIN_MODULES });

  const excerptHits = scanManyForStandardExcerpts(
    modules.map((m, i) => ({ text: m.textContent, where: `optimised module ${i + 1}` }))
  );
  if (excerptHits.length > 0) {
    throw new OptimizeCourseError(
      'Generated text looked like reproduced standard excerpt and was discarded. Try again or tighten the source.',
      502
    );
  }

  onProgress?.({ step: 'save', message: 'Saving preview for review…', percent: 94 });

  const draft: OptimizedCourseDraft = {
    token: randomUUID(),
    generatedAt: new Date().toISOString(),
    title: dto.title,
    description: dto.description,
    modules,
  };
  await persistOptimizeDraft(courseId, course.meta, draft);
  onProgress?.({ step: 'done', message: 'Draft ready to review.', percent: 100 });
  return draft;
}

export async function applyOptimizedCourseDraft(
  courseId: string,
  token: string,
  submitted?: OptimizedCourseDraft | null
): Promise<ReturnType<typeof courseToAdminDto>> {
  const course = await adminGetCourse(courseId);
  if (!course) throw new OptimizeCourseError('Not found', 404);
  const stored = readOptimizeDraft(course.meta);
  const draft =
    stored && (!token || stored.token === token)
      ? stored
      : submitted && submitted.modules.length > 0
        ? submitted
        : null;
  if (!draft || draft.modules.length === 0) {
    throw new OptimizeCourseError('No matching optimisation draft to apply', 409);
  }

  const dto = courseToAdminDto(course);
  const modules = draft.modules.map((m, i) => {
    const prev = dto.modules[i];
    return {
      id: prev?.id,
      title: prev?.title ?? m.title,
      textContent: scrubAiWriting(m.textContent),
      videoUrl: prev?.videoUrl || undefined,
      quiz: prev?.quiz,
    };
  });

  const updated = await adminUpdateCourse(courseId, {
    title: dto.title,
    description: dto.description,
    thumbnailUrl: dto.thumbnailUrl,
    introVideoUrl: dto.introVideoUrl,
    introThumbnailUrl: dto.introThumbnailUrl,
    isFree: dto.isFree,
    priceAud: dto.priceAud,
    published: dto.published,
    cecHours: dto.cecHours != null ? Number(dto.cecHours) : undefined,
    durationHours: dto.durationHours != null ? Number(dto.durationHours) : undefined,
    iicrcDiscipline: dto.iicrcDiscipline,
    level: dto.level,
    category: dto.category,
    modules,
  });

  const fresh = await prisma.lmsCourse.findUnique({ where: { id: courseId } });
  const next = metaObject(fresh?.meta);
  delete next[META_KEY];
  next[OPTIMIZE_APPLIED_META_KEY] = new Date().toISOString();
  await prisma.lmsCourse.update({
    where: { id: courseId },
    data: { meta: next as Prisma.InputJsonValue },
  });
  return courseToAdminDto(updated);
}

export async function optimizeAndApplyCourse(
  courseId: string,
  opts?: { allowFree?: boolean }
): Promise<{
  courseId: string;
  title: string;
  previousModuleCount: number;
  moduleCount: number;
  summary: string;
}> {
  const existing = await adminGetCourse(courseId);
  if (!existing) throw new OptimizeCourseError('Not found', 404);
  const dto = courseToAdminDto(existing);
  if (dto.isFree && !opts?.allowFree) {
    throw new OptimizeCourseError('Free courses are not optimised by the paid cron', 400);
  }
  if (!dto.isFree && opts?.allowFree) {
    throw new OptimizeCourseError('Paid courses are not optimised by the free cron', 400);
  }
  const previousModuleCount = dto.modules.length;
  await snapshotCourseBeforeOptimize(
    courseId,
    existing.meta,
    dto.modules.map((m) => ({ title: m.title, textContent: m.textContent }))
  );
  const draft = await generateOptimizedCourseDraft(courseId);
  const course = await applyOptimizedCourseDraft(courseId, draft.token);
  const moduleCount = course.modules.length;
  const added = Math.max(0, moduleCount - previousModuleCount);
  const summary =
    added > 0
      ? `Rewrote ${previousModuleCount} modules and added ${added} (now ${moduleCount}), including a recap and job-site examples.`
      : `Rewrote ${moduleCount} modules with practical scenarios and a recap.`;
  return { courseId, title: course.title, previousModuleCount, moduleCount, summary };
}

export { AnthropicAPIError };
