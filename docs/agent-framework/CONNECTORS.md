# Training Course Connectors

A **connector** is anything that gets training-course material *into* (or back *out of*) the
CARSI LMS, or that attaches generated media to it. This document maps every connector, its
source, its entrypoint, and where it writes — so we stop rediscovering the landscape each time.

It is the companion to `COURSE_CREATION_PIPELINE.md` (which covers the *authoring* pipeline);
this doc covers the *ingest, export, and media* plumbing around it.

---

## The canonical flow

Everything funnels through one idempotent spine:

```
external source ──▶ data/seed/courses-catalog.json ──▶ npm run db:seed-courses ──▶ Postgres
   (WP / DOCX / TXT)        (JSON snapshot)            (idempotent upsert by slug)   (LmsCourse / LmsModule / LmsLesson)
```

- **Idempotency key:** course `slug`. Seeding replaces a course's modules/lessons to match the
  snapshot, so re-running is safe.
- **Snapshot is the source of truth** for the 20 pilot courses. The bespoke `seed-*-docx/txt`
  scripts below write *directly to Postgres* instead, bypassing the snapshot — see
  [Known issues](#known-issues).
- **Round-trip:** `db:export-courses` reads Postgres back into the JSON snapshot.

---

## 1. Catalogue connectors (canonical)

| Connector | npm script | Source → Target |
| --- | --- | --- |
| `seed-courses-catalog.ts` | `db:seed-courses` | `data/seed/courses-catalog.json` → Postgres (idempotent upsert by slug) |
| `export-courses-catalog.ts` | `db:export-courses` (`-- --all`) | Postgres → `data/seed/courses-catalog.json` |
| `seed-course-cec-hours.ts` | `db:seed-cec-hours` (`--overwrite`, `--dry-run`) | Backfills `lms_courses.cec_hours` via the CEC resolver; never overwrites existing values unless `--overwrite` |

Catalogue types and the CEC resolver live in `src/lib/seed/` (`courses-catalog-types.ts`,
`cec-hours.ts`).

---

## 2. WordPress connectors

The legacy carsi.com.au site (WordPress + WooCommerce + LearnDash) was migrated through a
multi-step chain that landed in `data/wordpress-export/*.json` first, then into Postgres.

> **Live WP/WooCommerce scrape is retired.** carsi.com.au is now this DigitalOcean app —
> there is no WordPress/WooCommerce source to scrape anymore. The committed
> `data/wordpress-export/*.json` exports are the source of truth the seed scripts below
> read; the original scraper (`wp-migrate.ts`) and its `WC_CONSUMER_KEY/SECRET` were
> removed in #122. The export JSON remains in git history if a re-scrape is ever needed.

| Connector | npm script | What it does |
| --- | --- | --- |
| `enrich-wp-export-cec.ts` | — (removed 2026-07-09) | Retired: derived `cec_hours` from meta/description prose, which is not IICRC approval. CEC hours now come only from `data/seed/cec-approvals.json` (the registry SSOT) or explicit founder-set values |
| `seed-wordpress-export-courses.ts` | `db:seed-wp-export` | Upserts **published** Woo courses → `lms_courses`, **excluding** the 20 pilot courses already in the catalogue snapshot |
| `seed-wordpress-lessons-wxr.ts` | `db:seed-wp-lessons` | Imports LearnDash `sfwd-lessons` from a WXR export → `lms_modules`/`lms_lessons` for the Woo-seeded courses |
| `set-wp-export-courses-draft.ts` | `db:set-wp-export-draft` | Sets the Woo-imported set to `draft` / `isPublished:false` (re-running `db:seed-wp-export` republishes) |
| `export-draft-courses-wp-dump.ts` | `db:export-draft-courses-wp` | Dumps every `draft` course + its Woo source row → `wordpress-export/draft-courses-dump.json` (gitignored) |
| `delete-wp-duplicate-monitoring-course.ts` | — (one-off) | Cleanup of a Woo duplicate that collided with a seed course |

> The pilot 20 (catalogue snapshot) and the WordPress-imported courses are **deliberately kept
> disjoint** — the WP seeders skip any slug owned by the snapshot.

---

## 3. Document seeders (DOCX → Postgres)

Each parses Word XML paragraph-by-paragraph (no summarisation) and writes courses/modules/lessons
**directly to Postgres**. All share the same flags: `--replace` (delete-by-slug then insert) and
`--dry-run`. Lesson bodies are stored as **plain text** (no HTML).

| Connector | npm script | Source file |
| --- | --- | --- |
| `seed-air-quality-docx.ts` | `db:seed-air-quality-docx` | `data/air_quality_courses.docx` |
| `seed-safety-ppe-docx.ts` | `db:seed-safety-ppe-docx` | `data/safety_ppe_courses.docx` |
| `seed-whs-compliance-docx.ts` | `db:seed-whs-compliance-docx` | `data/CARSI_WHS_Compliance_Courses.docx` |
| `seed-marketing-business-docx.ts` | `db:seed-marketing-business-docx` | `data/CARSI_Marketing_Business_6_Courses.docx` |
| `seed-microbial-docx.ts` | `db:seed-microbial-docx` | `data/Microbial.docx` (Section B only) |
| `seed-odour-smoke-psychro-drying-docx.ts` | `db:seed-odour-smoke-psychro-drying-docx` | `data/CARSI_Odour_Smoke_Psychro_Drying.docx` |

---

## 4. Text seeders (TXT → Postgres)

Same shape as the DOCX seeders (`--replace`, `--dry-run`, plain-text bodies, direct-to-Postgres),
parsing a structured `.txt` layout (`COURSE N OF M` / `MODULE K:` blocks).

| Connector | npm script | Source file |
| --- | --- | --- |
| `seed-water-damage-txt.ts` | `db:seed-water-damage-txt` | `data/water_damage_restoration_courses.txt` |
| `seed-specialty-drying-txt.ts` | `db:seed-specialty-drying-txt` | `data/contents_specialty_drying_courses.txt` |
| `seed-contents-specialty-drying-courses-txt.ts` | `db:seed-contents-specialty-drying-courses-txt` | `data/CONTENTS & SPECIALTY DRYING COURSES.txt` |
| `seed-specialty-courses-resources-txt.ts` | `db:seed-specialty-courses-resources-txt` | `data/specialty_courses_resources.txt` (glass/duct + resources/memberships) |
| `seed-technology-inspection-tools-txt.ts` | `db:seed-technology-inspection-tools-txt` | `data/technology_inspection_tools_courses.txt` |
| `seed-carsi-specialty-courses-collection-txt.ts` | `db:seed-specialty-collection-txt` | `data/CARSI_Specialty_Courses_Collection.txt` |
| `sync-specialty-modules-from-collection-txt.ts` | `db:sync-specialty-modules` | Repairs courses with placeholder modules by re-reading the collection `.txt` |

---

## 5. Media connectors (generation → Cloudinary → LMS)

These attach generated media to existing courses/lessons. Every one splits **judgement from
spend**: Claude authors a JSON brief, a deterministic `tsx` script consumes it and calls the paid
API. All have `--dry-run`/`--plan`, a hard cap, a resumable manifest, and a spend confirmation.

| Connector | npm scripts | API | Writes |
| --- | --- | --- | --- |
| `generate-course-thumbnails.ts` | `db:thumbnails:plan` / `db:thumbnails:generate` | OpenAI `gpt-image-1` | `thumbnailUrl` (via Cloudinary `carsi/admin-courses`) |
| `generate-course-voiceover.ts` | `voice:plan` / `voice:generate` | ElevenLabs TTS | Per-lesson audio in `resources` (Cloudinary `carsi/course-audio`) |
| `automate-brand-videos.ts` | `video:brand:plan` / `:submit` / `:poll` / `:generate` | HeyGen | Brand video MP4s (Cloudinary `carsi/demo-videos`) |
| `generate-demo-videos.ts` | `video:demo:plan` / `:record` / `:composite` / `:upload` / `:generate` | local record + composite | Demo video MP4s |

Briefs: `data/thumbnails/course-thumbnail-briefs.json`, `data/voice/course-voice-briefs.json`.
Upload helper: `src/lib/server/cloudinary-upload.ts`.

> The ElevenLabs and HeyGen/HyperFrames **MCP servers** exist for interactive previews only.
> Committed, spend-capped media must come from the scripts above, not from MCP calls.

---

## 6. Product / external-catalogue connectors

| Connector | npm scripts | Source → Target |
| --- | --- | --- |
| `scrape-ccw-products.ts` | `ccw:scrape:plan` / `ccw:scrape` | CCW Shopify `/products.json` + SDS PDFs → `data/seed/ccw-products.json` |

---

## Inspection / maintenance helpers

Not connectors themselves, but the tools you reach for when auditing connector output:

| Script | npm script | Purpose |
| --- | --- | --- |
| `list-courses-under-module-count.ts` | `db:list-low-module-courses` | Find courses with suspiciously few modules (placeholder content) |
| `analyze-module-title-mismatch.ts` | `db:analyze-module-mismatch` | Detect module-title drift between source and DB |
| `strip-ai-vendor-references-from-lms.ts` | `db:strip-ai-vendor-refs` | Scrub AI-vendor mentions from seeded content |

---

## Known issues

The media connectors are consolidated and gated; the **ingest side has sprawled**:

1. **13 near-duplicate seeders.** The DOCX (6) and TXT (7) seeders each re-implement
   parse → normalise → Postgres upsert with copy-pasted logic and no shared adapter interface.
   A single `Connector` contract (`parse(file) → CatalogCourse[]`) feeding the canonical
   `seed-courses-catalog` upsert would collapse them.
2. **Two write paths.** Catalogue + WP seeders go *through* `courses-catalog.json`; the DOCX/TXT
   seeders write *directly to Postgres*, so their content never round-trips into the snapshot and
   isn't covered by `db:export-courses`.
3. **WordPress fork.** Six scripts (scrape, enrich, seed-courses, seed-lessons, set-draft,
   export-dump) implement one migration as separate entrypoints rather than a staged pipeline.

If/when consolidation is taken on, the target is: **one adapter interface → the canonical
snapshot → one idempotent upsert.**
