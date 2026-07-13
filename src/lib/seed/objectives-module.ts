/**
 * Objectives-module ordering (GP-434).
 *
 * The source course documents (data/*.txt, data/*.docx) place their
 * "WHAT YOU WILL LEARN" learning-objectives appendix AFTER the teaching
 * modules, so every seed parser used to emit it as the LAST module — and the
 * seed scripts assign `orderIndex` from array position, so the objectives
 * module rendered LAST in the LMS curriculum. Learners must see the
 * objectives FIRST.
 *
 * `hoistObjectivesFirst` stable-partitions a parsed module list: any
 * objectives module(s) move to the front (keeping their own relative order)
 * while every other module keeps its original relative order — no unrelated
 * modules are reordered.
 */
const OBJECTIVES_TITLE = /^WHAT YOU WILL LEARN\b/i;

export function isObjectivesModuleTitle(title: string): boolean {
  return OBJECTIVES_TITLE.test(title.trim());
}

export function hoistObjectivesFirst<T extends { title: string }>(modules: T[]): T[] {
  const objectives = modules.filter((m) => isObjectivesModuleTitle(m.title));
  if (objectives.length === 0) return modules;
  return [...objectives, ...modules.filter((m) => !isObjectivesModuleTitle(m.title))];
}
