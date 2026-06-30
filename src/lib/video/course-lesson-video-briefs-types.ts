/**
 * JSON shape for `data/video/course-lesson-video-briefs.json`.
 *
 * Mirrors `src/lib/voice/course-voice-briefs-types.ts`. The briefs file is the contract between
 * the two halves of the lesson-video tool:
 *   - Claude (the course author) AUTHORS one brief per lesson that needs a video — the narration
 *     script, on-screen title, and visual direction, in en-AU and on-brand.
 *   - `scripts/generate-course-lesson-videos.ts` CONSUMES the briefs deterministically: builds an
 *     SRT caption track, renders an avatar video via HeyGen, uploads the MP4 to Cloudinary, and
 *     writes the resulting video URL (+ captions) into the lesson's `resources` JSON.
 *
 * Identity is `courseSlug` + `lessonId` (the lesson UUID joins to `CatalogLesson.id`). No Prisma
 * schema change is needed: video URLs ride the existing JSON `resources` field on the lesson.
 *
 * Localisation: each brief carries a `locale` and the file a `defaultLanguage`. v1 ships en-AU with
 * an English SRT. To "expand later", add briefs (or a translation pass) per target language and
 * generate again; each language writes its own `LessonVideoResource` (keyed by `language`).
 */
export const VIDEO_BRIEFS_VERSION = 1 as const;

/**
 * One video entry written into a lesson's `resources` array. The extra `kind: 'video'` marks it so
 * the generator can find-and-replace its own entry idempotently (per language). The base
 * `{ label, url }` shape is what `LessonPlayer` already understands for resources.
 */
export type LessonVideoResource = {
  label: string;
  url: string;
  kind: 'video';
  /** Optional caption/subtitle track (SRT/VTT) URL for this video. */
  captionsUrl?: string;
  /** BCP-47-ish locale tag, e.g. "en-AU". Lets multiple language tracks coexist on one lesson. */
  language?: string;
};

export type CourseLessonVideoBrief = {
  /** Joins to `CatalogCourse.slug`. */
  courseSlug: string;
  /** Joins to `CatalogLesson.id` (lesson UUID) — the per-lesson identity key. */
  lessonId: string;
  /** Denormalised for human review of the JSON diff; never used to build request identity. */
  lessonTitle: string;
  /** Denormalised parent module title (review aid). */
  moduleTitle?: string;
  /** Short on-screen video title. */
  title: string;
  /** The narration text the author writes. The "complete" gate keys off this being non-empty. */
  script: string;
  /** Video format/intent, e.g. "lesson-intro". */
  format: string;
  /** Target spoken duration in seconds (review aid; HeyGen times to the script). */
  durationSeconds: number;
  /** HeyGen avatar id; null falls back to `HEYGEN_AVATAR_ID`. */
  avatarId: string | null;
  /** HeyGen voice id; null falls back to `HEYGEN_VOICE_ID`. */
  voiceId: string | null;
  /** Locale tag for voice + captions, e.g. "en-AU". */
  locale: string;
  /** Whether to request an SRT caption track (required for public/lesson videos). */
  captions: boolean;
  /** One line describing what's on screen / b-roll (review + production aid; not sent to HeyGen). */
  visualDirection?: string;
  /** Optional reasoning trace (review aid; not sent to the API). */
  authorNote?: string;
};

export type VideoBriefsFile = {
  version: typeof VIDEO_BRIEFS_VERSION;
  generatedAt: string;
  /** Default language for the set, e.g. "en-AU". */
  defaultLanguage?: string;
  briefs: CourseLessonVideoBrief[];
};

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

/** Runtime guard mirroring `isVoiceBriefsFile`. */
export function isVideoBriefsFile(value: unknown): value is VideoBriefsFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  if (file.version !== VIDEO_BRIEFS_VERSION) return false;
  if (!Array.isArray(file.briefs)) return false;
  return file.briefs.every((b) => {
    if (typeof b !== 'object' || b === null) return false;
    const brief = b as Record<string, unknown>;
    return (
      isNonEmptyString(brief.courseSlug) &&
      isNonEmptyString(brief.lessonId) &&
      typeof brief.lessonTitle === 'string' &&
      typeof brief.title === 'string' &&
      typeof brief.script === 'string' &&
      typeof brief.format === 'string' &&
      typeof brief.durationSeconds === 'number' &&
      (brief.avatarId === null || typeof brief.avatarId === 'string') &&
      (brief.voiceId === null || typeof brief.voiceId === 'string') &&
      typeof brief.locale === 'string' &&
      typeof brief.captions === 'boolean'
    );
  });
}

/**
 * A brief is "complete" (ready to spend money rendering) only when the narration script is authored.
 * A bare `--plan` skeleton has an empty `script`.
 */
export function isVideoBriefComplete(brief: CourseLessonVideoBrief): boolean {
  return isNonEmptyString(brief.script);
}
