---
description: Turn a CARSI course research pack into the catalogue skeleton (course + modules + lessons) in data/seed/courses-catalog.json.
argument-hint: --slug=<slug>  (reads data/courses/<slug>/research.md)
---

# /course-construct — catalogue skeleton

Convert the verified research pack into a **structurally complete `CatalogCourse`** with empty
lesson bodies, ready for `/course-develop` to fill.

**Args:** `$ARGUMENTS`

## Load first
- `skills/design/foundation-first.skill.md` — psychology → personas → journeys → acceptance criteria.
- `skills/context/project-context.skill.md` — CARSI stack + conventions.
- The exact shape: `src/lib/seed/courses-catalog-types.ts` (`CatalogCourse`, `CatalogModule`, `CatalogLesson`, `isCoursesCatalogFile`).

## Procedure
1. **Read** `data/courses/<slug>/research.md` and the existing `data/seed/courses-catalog.json` (to reuse an `instructors[]` id and confirm slug uniqueness).
2. **Author the `CatalogCourse`:** `slug`, `title`, `description`, `shortDescription`, `level`, `category`, `iicrcDiscipline`, `cecHours`, `priceAud` (decimal string), `isFree`, `durationHours`, `status`, `isPublished` (keep unpublished until ship), `tags`, `meta`. Reuse an existing `instructorId`.
3. **Author `modules[] → lessons[]`:** logical module grouping; each lesson gets `title`, `contentType` (use the values already in the catalogue — e.g. `text`/`video`/`quiz`; confirm by reading a seeded course, don't invent one), `orderIndex`, `isPreview` (true on the intro lesson), `contentBody: null` (filled later), `resources: []`. Generate UUID `id`s for course/modules/lessons (match the format of existing rows).
4. **Merge** the new course into `courses[]` in `data/seed/courses-catalog.json` (do not disturb other courses; keep `version` = `COURSES_CATALOG_VERSION`).

## Verification
- The file still passes `isCoursesCatalogFile`.
- The slug is unique across `courses[].slug`.
- `npm run type-check` is green.

**Output:** the merged catalogue + a one-line module/lesson outline for review. Then `/course-develop`.
