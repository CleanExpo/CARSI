const READING_SUFFIX = /\s*[—–-]\s*(Re-?)?Reading\s*$/i;

/** Drop "Module title — Reading" down to "Reading" so the outline does not repeat. */
export function outlineLessonLabel(lessonTitle: string, moduleTitle: string): string {
  const lesson = lessonTitle.trim();
  const mod = moduleTitle.trim();
  if (!lesson) return 'Lesson';
  const withoutReading = lesson.replace(READING_SUFFIX, '').trim();
  if (!withoutReading || withoutReading.toLowerCase() === mod.toLowerCase()) {
    return /re-?reading/i.test(lesson) ? 'Re-reading' : 'Reading';
  }
  return lesson;
}
