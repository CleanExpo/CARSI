/**
 * JSON shape for `data/thumbnails/course-thumbnail-briefs.json`.
 *
 * The briefs file is the contract between the two halves of the thumbnail tool:
 *   - Claude (the `course-thumbnails` skill) AUTHORS one brief per course — this is
 *     where the understanding of the course subject, IICRC discipline, and learner
 *     benefit lives.
 *   - `scripts/generate-course-thumbnails.ts` CONSUMES the briefs deterministically:
 *     builds a prompt, calls OpenAI `gpt-image-1`, uploads to Cloudinary, and writes
 *     the resulting URL into `LmsCourse.thumbnailUrl`.
 *
 * The generated image is a TEXT-FREE background. The app composites the course title +
 * a discipline-coloured wash + a dark vignette over it (see
 * `src/components/lms/CourseTextThumbnail.tsx`), so briefs must keep the focal mass
 * off-centre/low and the upper-left calm and dark for the overlaid white title.
 */
export const THUMBNAIL_BRIEFS_VERSION = 1 as const;

/** Rendering style hint for the generated background. */
export type ThumbnailStyle = 'photoreal' | 'illustration' | 'abstract-conceptual';

export type CourseThumbnailBrief = {
  /** Joins to `LmsCourse.slug` — the ONLY identity key. */
  slug: string;
  /** Denormalised for human review of the JSON diff; never used to build prompt identity. */
  title: string;
  /** IICRC code (WRT/CRT/ASD/AMRT/FSRT/OCT/CCT) or null when the course isn't discipline-coded. */
  discipline: string | null;
  /** One-sentence core idea grounded in the course subject + learner benefit. */
  concept: string;
  /** 2–5 concrete visual elements drawn from the course's actual content. */
  motifs: string[];
  /** Colour direction in WORDS (gpt-image-1 follows prose better than hex), tuned to the discipline accent. */
  palette: string;
  /** Emotional tone, e.g. "calm, professional, trustworthy, Australian training". */
  mood: string;
  /** Chosen per subject; default 'photoreal' for hands-on disciplines. */
  style: ThumbnailStyle;
  /** Composition direction — MUST keep the upper-left calm/dark and the focal mass off-centre/low. */
  composition: string;
  /** Hard exclusions appended to the prompt: text, words, letters, numbers, logos, watermarks, signage, UI (+faces by default). */
  negativePrompt: string;
  /** Optional reasoning trace: why these motifs fit the subject + benefit (review aid; not sent to the model). */
  authorNote?: string;
};

export type ThumbnailBriefsFile = {
  version: typeof THUMBNAIL_BRIEFS_VERSION;
  generatedAt: string;
  briefs: CourseThumbnailBrief[];
};

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

/** Runtime guard mirroring `isCoursesCatalogFile` in `src/lib/seed/courses-catalog-types.ts`. */
export function isThumbnailBriefsFile(value: unknown): value is ThumbnailBriefsFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  if (file.version !== THUMBNAIL_BRIEFS_VERSION) return false;
  if (!Array.isArray(file.briefs)) return false;
  return file.briefs.every((b) => {
    if (typeof b !== 'object' || b === null) return false;
    const brief = b as Record<string, unknown>;
    return (
      isNonEmptyString(brief.slug) &&
      typeof brief.title === 'string' &&
      (brief.discipline === null || typeof brief.discipline === 'string') &&
      typeof brief.concept === 'string' &&
      Array.isArray(brief.motifs) &&
      typeof brief.palette === 'string' &&
      typeof brief.mood === 'string' &&
      typeof brief.style === 'string' &&
      typeof brief.composition === 'string' &&
      typeof brief.negativePrompt === 'string'
    );
  });
}

/**
 * A brief is "complete" (ready to spend money generating) only when Claude has filled
 * the creative fields. A bare `--plan` skeleton has empty concept/motifs/composition.
 */
export function isBriefComplete(brief: CourseThumbnailBrief): boolean {
  return (
    isNonEmptyString(brief.concept) &&
    Array.isArray(brief.motifs) &&
    brief.motifs.filter(isNonEmptyString).length > 0 &&
    isNonEmptyString(brief.composition) &&
    isNonEmptyString(brief.negativePrompt)
  );
}
