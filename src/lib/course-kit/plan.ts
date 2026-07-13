/**
 * Plan-side helpers for the course-asset-kit engine (GP-488).
 *
 * Pure inspection of a course's lesson `resources` — the CLI pairs this with
 * on-disk file-existence checks to build the full gap report.
 */

import type { KitCourse } from './types';

/** The resource kinds the LMS player renders inline or as links. */
export type AttachedResourceKind = 'flashcards' | 'slides' | 'audio' | 'image' | 'video' | 'link';

/**
 * Inspect a course's lessons and report which resource kinds are attached and
 * how many lessons carry at least one resource. Mirrors the loose runtime shape
 * of `LmsLesson.resources` (an array of `{ kind?, url?, ... }`).
 */
export function detectAttachedResources(course: KitCourse): {
  kinds: Set<AttachedResourceKind>;
  lessonsWithResources: number;
  totalLessons: number;
} {
  const kinds = new Set<AttachedResourceKind>();
  let lessonsWithResources = 0;
  let totalLessons = 0;

  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      totalLessons += 1;
      const resources = lesson.resources;
      if (!Array.isArray(resources) || resources.length === 0) continue;
      let has = false;
      for (const raw of resources) {
        if (!raw || typeof raw !== 'object') continue;
        const r = raw as { kind?: unknown; url?: unknown };
        if (r.kind === 'flashcards') {
          kinds.add('flashcards');
          has = true;
        } else if (r.kind === 'slides') {
          kinds.add('slides');
          has = true;
        } else if (r.kind === 'audio') {
          kinds.add('audio');
          has = true;
        } else if (r.kind === 'image') {
          kinds.add('image');
          has = true;
        } else if (r.kind === 'video') {
          kinds.add('video');
          has = true;
        } else if (typeof r.url === 'string' && r.url) {
          kinds.add('link');
          has = true;
        }
      }
      if (has) lessonsWithResources += 1;
    }
  }

  return { kinds, lessonsWithResources, totalLessons };
}
