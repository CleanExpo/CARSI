/**
 * AI-assisted CARSI course creation (GP-129) — server logic.
 *
 * Generates AU-original lesson/quiz drafts from a CARSI-authored outline. The IICRC
 * AI-Use Policy is enforced at BOTH ends (CLAUDE.md § "IICRC standards IP + AI use"):
 *   1. Pre-generation input guard — reject any submission containing IICRC standard text
 *      BEFORE it reaches the model (assertNoStandardText).
 *   2. Post-generation excerpt scan — a release-blocker if the model output itself looks
 *      like a reproduced standard excerpt.
 * Output rules baked into the prompt: Australian-produced (AU English, 230 V/10 A, metric,
 * AUD, AS/NZS + Safe Work Australia), IICRC referenced nominatively only, never reproduced;
 * no IICRC discipline-acronym branding; nothing implying CARSI delivers IICRC certification.
 */

import { z } from 'zod';

import { AnthropicClient } from '@/lib/anthropic/client';
import { CLAUDE_MODELS, type TextBlock } from '@/lib/anthropic/types';
import {
  CourseBuilderInputError,
  assertNoStandardText,
} from '@/lib/course-kit/ai-course-builder-guard';
import { scanManyForStandardExcerpts } from '@/lib/course-kit/standards-excerpt';

export class AiCourseBuilderError extends Error {
  readonly status: number;
  readonly detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'AiCourseBuilderError';
    this.status = status;
    this.detail = detail;
  }
}

const InputSchema = z.object({
  title: z.string().trim().min(3, 'Course title is too short').max(160),
  course_outline: z
    .string()
    .trim()
    .min(20, 'Provide a fuller outline (your own words, at least 20 characters)')
    .max(8000),
  category: z.string().trim().max(120).optional().default(''),
  module_count: z.coerce.number().int().min(2).max(5).default(3),
});

export type AiCourseBuilderInput = z.infer<typeof InputSchema>;

export function parseAiCourseBuilderInput(raw: unknown): AiCourseBuilderInput {
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AiCourseBuilderError(first?.message ?? 'Invalid input', 400);
  }
  return parsed.data;
}

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  correct_index: z.number().int().min(0),
});

const LessonSchema = z.object({
  title: z.string(),
  content: z.string(),
  key_takeaways: z.array(z.string()).default([]),
  quiz_questions: z.array(QuizQuestionSchema).default([]),
});

const ModuleSchema = z.object({
  name: z.string(),
  description: z.string(),
  lessons: z.array(LessonSchema).min(1),
});

const DraftSchema = z.object({ modules: z.array(ModuleSchema).min(1) });

export type AiCourseDraft = z.infer<typeof DraftSchema>;

const SYSTEM_PROMPT = [
  'You are a senior Australian instructional designer authoring original course content for CARSI,',
  'an Australian restoration & cleaning training provider. You write for the Australian market.',
  '',
  'ABSOLUTE RULES (a violation makes the output unusable):',
  '1. Australian-produced only: Australian English spelling (odour, colour, metre, mould, licence,',
  '   -ise), Australian power (230 V / 50 Hz, 10 A GPO, RCD/safety switch, AS/NZS — never 115 V or US',
  '   circuits), metric units (metres, m², litres, m³/h; imperial only in parentheses), products',
  '   available in Australia in 240 V form, AS/NZS + Safe Work Australia standards, AUD pricing.',
  '2. NEVER reproduce IICRC (or any third-party) standard text — no sections, tables, clause numbers,',
  '   procedures or definitions. You MAY reference a standard nominatively only ("aligned to',
  '   ANSI/IICRC S500:2021"). Do not paste or paraphrase standard body text.',
  '3. NEVER brand the course with IICRC Registered-Training-School discipline acronyms',
  '   (WRT/ASD/AMRT/FSRT/CCT/TCST) and never call it "[discipline]-aligned".',
  '4. NEVER imply CARSI delivers IICRC courses or certification. CARSI issues its own designations',
  '   and (separately) earns IICRC CECs; do not state or imply any CEC hours in the content.',
  '5. Write from general domain knowledge and the CARSI-authored outline supplied — not from any',
  '   copyrighted standard.',
  '',
  'OUTPUT FORMAT: respond with ONLY valid minified JSON, no markdown, no commentary. Shape:',
  '{"modules":[{"name":string,"description":string,"lessons":[{"title":string,"content":string,',
  '"key_takeaways":string[],"quiz_questions":[{"question":string,"options":string[],',
  '"correct_index":number}]}]}]}. Provide 2-4 lessons per module and 2-3 quiz questions per lesson,',
  'each quiz question with 4 options and a 0-based correct_index.',
].join('\n');

function extractText(blocks: Array<{ type: string }>): string {
  return blocks
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

function stripJsonFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

/**
 * Guard the input, call Claude Sonnet, validate + excerpt-scan the output.
 * Throws {@link AiCourseBuilderError} with an HTTP status on any failure.
 */
export async function generateCourseDraft(input: AiCourseBuilderInput): Promise<AiCourseDraft> {
  // 1. Pre-generation input guard — reject IICRC standard text before any model call.
  try {
    assertNoStandardText([
      { text: input.title, where: 'title' },
      { text: input.category, where: 'category' },
      { text: input.course_outline, where: 'course_outline' },
    ]);
  } catch (err) {
    if (err instanceof CourseBuilderInputError) {
      throw new AiCourseBuilderError(err.message, 422, err.hits);
    }
    throw err;
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new AiCourseBuilderError('AI course builder is not configured', 503);
  }

  const userPrompt = [
    `Course title: ${input.title}`,
    input.category ? `Category / subject area: ${input.category}` : '',
    `Number of modules: ${input.module_count}`,
    '',
    'CARSI-authored outline / learning objectives (author their own words — not standard text):',
    input.course_outline,
  ]
    .filter(Boolean)
    .join('\n');

  const client = new AnthropicClient({ defaultModel: CLAUDE_MODELS.SONNET_5 });

  let raw: string;
  try {
    const response = await client.messages({
      model: CLAUDE_MODELS.SONNET_5,
      max_tokens: 8000,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    raw = extractText(response.content);
  } catch (err) {
    throw new AiCourseBuilderError(
      `Course generation failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      502
    );
  }

  let draft: AiCourseDraft;
  try {
    draft = DraftSchema.parse(JSON.parse(stripJsonFences(raw)));
  } catch {
    throw new AiCourseBuilderError('AI returned malformed course content', 502);
  }

  // 2. Post-generation excerpt scan — release-blocker if the output looks like standard text.
  const scanEntries = draft.modules.flatMap((m, mi) => [
    { text: m.description, where: `module ${mi + 1} description` },
    ...m.lessons.map((l, li) => ({
      text: `${l.content}\n${l.key_takeaways.join('\n')}`,
      where: `module ${mi + 1} lesson ${li + 1}`,
    })),
  ]);
  const hits = scanManyForStandardExcerpts(scanEntries);
  if (hits.length > 0) {
    throw new AiCourseBuilderError(
      'Generated content was flagged as a possible reproduced standard excerpt and was blocked. ' +
        'Reword the outline and try again.',
      422,
      hits
    );
  }

  return draft;
}
