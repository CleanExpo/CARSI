/**
 * JSON shape for `data/voice/course-voice-briefs.json`.
 *
 * The briefs file is the contract between the two halves of the voice-narration tool
 * (mirrors `src/lib/thumbnails/course-thumbnail-briefs-types.ts`):
 *   - Claude (the `course-voiceover` skill) AUTHORS one brief per lesson that needs audio —
 *     this is where the understanding of the lesson, its tone, and the en-AU narration
 *     script lives.
 *   - `scripts/generate-course-voiceover.ts` CONSUMES the briefs deterministically: calls
 *     the ElevenLabs text-to-speech REST API, uploads the MP3 to Cloudinary, and writes the
 *     resulting audio URL into the lesson's `resources` JSON (`CatalogLesson.resources`).
 *
 * Identity is `courseSlug` + `lessonId` (the lesson UUID joins to `CatalogLesson.id` /
 * `LmsLesson.id`). No Prisma schema change is needed: audio URLs ride the existing JSON
 * `resources` field on the lesson.
 */
export const VOICE_BRIEFS_VERSION = 1 as const;

/**
 * One narration entry written into a lesson's `resources` array. Extra `kind` field marks it
 * as audio so the generator can find-and-replace its own entry idempotently. The base
 * `{ label, url }` shape is what `LessonPlayer` already understands for downloadable resources.
 */
export type LessonAudioResource = {
  label: string;
  url: string;
  kind: 'audio';
};

export type CourseVoiceBrief = {
  /** Joins to `CatalogCourse.slug` — the course this lesson belongs to. */
  courseSlug: string;
  /** Joins to `CatalogLesson.id` (lesson UUID) — the per-lesson identity key. */
  lessonId: string;
  /** Denormalised for human review of the JSON diff; never used to build request identity. */
  lessonTitle: string;
  /** The narration text Claude authors. The "complete" gate keys off this being non-empty. */
  script: string;
  /** ElevenLabs voice id; null falls back to `ELEVENLABS_VOICE_ID`. */
  voiceId: string | null;
  /** ElevenLabs model id; null falls back to `ELEVENLABS_MODEL_ID` (default eleven_multilingual_v2). */
  modelId: string | null;
  /** Voice setting 0..1; null lets the script apply a calm-professional default. */
  stability: number | null;
  /** Voice setting 0..1; null lets the script apply a default. */
  similarityBoost: number | null;
  /** Voice setting 0..1 (expressiveness); keep low for the en-AU training tone; null = default. */
  style: number | null;
  /** Locale tag for review/consistency, e.g. "en-AU". */
  locale: string;
  /** Optional reasoning trace: why this script/tone fits the lesson (review aid; not sent to the API). */
  authorNote?: string;
};

export type VoiceBriefsFile = {
  version: typeof VOICE_BRIEFS_VERSION;
  generatedAt: string;
  briefs: CourseVoiceBrief[];
};

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

function isNullableNumber(x: unknown): x is number | null {
  return x === null || typeof x === 'number';
}

/** Runtime guard mirroring `isThumbnailBriefsFile`. */
export function isVoiceBriefsFile(value: unknown): value is VoiceBriefsFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  if (file.version !== VOICE_BRIEFS_VERSION) return false;
  if (!Array.isArray(file.briefs)) return false;
  return file.briefs.every((b) => {
    if (typeof b !== 'object' || b === null) return false;
    const brief = b as Record<string, unknown>;
    return (
      isNonEmptyString(brief.courseSlug) &&
      isNonEmptyString(brief.lessonId) &&
      typeof brief.lessonTitle === 'string' &&
      typeof brief.script === 'string' &&
      (brief.voiceId === null || typeof brief.voiceId === 'string') &&
      (brief.modelId === null || typeof brief.modelId === 'string') &&
      isNullableNumber(brief.stability) &&
      isNullableNumber(brief.similarityBoost) &&
      isNullableNumber(brief.style) &&
      typeof brief.locale === 'string'
    );
  });
}

/**
 * A brief is "complete" (ready to spend money generating) only when Claude has authored the
 * narration script. A bare `--plan` skeleton has an empty `script`.
 */
export function isVoiceBriefComplete(brief: CourseVoiceBrief): boolean {
  return isNonEmptyString(brief.script);
}
