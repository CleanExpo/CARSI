/**
 * Pure helpers for the lesson-video generator (`scripts/generate-course-lesson-videos.ts`).
 * Extracted so they can be unit-tested without the script's I/O, HeyGen, or Cloudinary side effects.
 */
import type { LessonVideoResource } from './course-lesson-video-briefs-types';

/** Format a seconds value as an SRT timestamp `HH:MM:SS,mmm`. */
export function formatSrtTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const ms = Math.floor((safe % 1) * 1000);
  const total = Math.floor(safe);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/**
 * Build an SRT caption track from a narration script. Splits on sentence punctuation and
 * approximates timing from sentence length (~15 chars/sec spoken, min 1.6s per cue).
 */
export function buildSrt(script: string): string {
  const sentences =
    script
      .replace(/\s+/g, ' ')
      .match(/[^.!?]+[.!?]*/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? [script.trim()];
  let cursor = 0;
  return sentences
    .map((sentence, index) => {
      const duration = Math.max(1.6, sentence.length / 15);
      const start = cursor;
      const end = cursor + duration;
      cursor = end;
      return `${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${sentence}\n`;
    })
    .join('\n');
}

/**
 * Merge a video resource into a lesson's existing `resources`, idempotently per language:
 * keeps non-video resources and video resources for OTHER languages, and replaces any existing
 * video for the same language.
 */
export function mergeVideoResource(
  existing: unknown,
  res: LessonVideoResource
): LessonVideoResource[] {
  const lang = res.language ?? 'en-AU';
  const base = Array.isArray(existing)
    ? (existing as unknown[]).filter((r) => {
        if (typeof r !== 'object' || r === null) return true;
        const o = r as Record<string, unknown>;
        return o.kind !== 'video' || (o.language ?? 'en-AU') !== lang;
      })
    : [];
  return [...(base as LessonVideoResource[]), res];
}
