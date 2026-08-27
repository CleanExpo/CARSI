# Design: Student Credentials Wallet + Notes Pages

**Date:** 06/03/2026
**Status:** Approved

## Problem

Two student pages are missing despite their backend DB models being present:

- `/student/credentials` — credential wallet showing completed course certificates
- `/student/notes` — per-lesson notes written during learning

Additionally, `lms_credentials.py` lacks a `GET /me` endpoint, and `lms_notes.py` does not exist.

## Architecture

### Backend — 3 changes

#### 1. `lms_credentials.py` — Add `GET /api/lms/credentials/me`

Joins `LMSEnrollment` → `LMSCourse` for the current user, filters `status == "completed"`.
Returns list of `CredentialOut` with `iicrc_discipline`, `cec_hours`, `cppp40421_unit_code`.
Auth: `get_current_lms_user` dependency (X-User-Id header).

#### 2. `lms_notes.py` (new file)

Three endpoints:

- `GET /api/lms/notes/me` — all notes for current user, joins lesson title, module title, course title + slug
- `PUT /api/lms/notes/{lesson_id}` — upsert note content (create if not exists, update if exists)
- `DELETE /api/lms/notes/{lesson_id}` — delete note for a lesson

Uses `LMSLessonNote` model (already in `lms_models.py`, table `lms_lesson_notes`).

#### 3. `main.py` — import + register `lms_notes.router`

### Frontend — 2 new pages

#### `/student/credentials/page.tsx`

- `'use client'` page fetching `GET /api/lms/credentials/me`
- Grid of credential cards (matching existing card pattern)
- Each card: course title, IICRC discipline badge (spectral colour), CEC hours, issued date (DD MMM YYYY)
- Actions: "View Certificate" → `/credentials/[id]`, "Download PDF" → `/api/lms/credentials/[id]/pdf`
- Empty state when no completed courses

#### `/student/notes/page.tsx`

- `'use client'` page fetching `GET /api/lms/notes/me`
- Notes grouped by course
- Each note: lesson title, content preview, inline edit textarea (PUT on save), "Go to lesson" link
- Delete button per note

### Design tokens (consistent with existing student pages)

- Background: `#050505` (OLED Black)
- Cards: `rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5`
- Section headers: `font-mono text-xs tracking-widest text-white/40 uppercase`
- Status badges: `rounded-sm px-2.5 py-1 font-mono text-xs`
- Spectral discipline colours: cyan (WRT), emerald (CRT), amber (OCT), blue (ASD), magenta (CCT)
- Empty state: `text-sm text-white/30`

## Success Criteria

- `GET /api/lms/credentials/me` returns 200 with credential list for authenticated student
- `GET /api/lms/notes/me` returns 200 with notes list (including lesson + course metadata)
- `PUT /api/lms/notes/{lesson_id}` creates or updates note content
- `/student/credentials` renders without errors, shows credential cards for completed courses
- `/student/notes` renders without errors, shows editable notes grouped by course
- TypeScript type-check passes (0 errors)
- No console errors on either page
