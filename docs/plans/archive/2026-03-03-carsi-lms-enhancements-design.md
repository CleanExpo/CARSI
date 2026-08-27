# CARSI LMS — Enhancement Design Document

**Date:** 2026-03-03
**Status:** Approved
**Author:** Brainstorming session with Phill

---

## Overview

CARSI is not a straight clone of the existing WordPress/WooCommerce LMS. This document defines the **enhancement layer** built on top of the core LMS rebuild — features that differentiate CARSI from generic LMS platforms and address the primary audience: professional carpet cleaners, floor care technicians, and water damage restoration specialists seeking IICRC CEC accreditation and alignment with the Australian Cert IV in Cleaning (CPP40421).

---

## Problem Statement

**Primary gap identified:** Low student engagement and high dropout rates.

Trade professionals enrol but don't complete courses. The existing platform provides no meaningful sense of progress, achievement, or professional credential value beyond course access. There is no recognition of the IICRC framework students are working within.

---

## Target Audience

- Professional carpet cleaners, floor care technicians, water/fire/mould restoration specialists
- Working toward IICRC certification and/or CPP40421 Cert IV in Cleaning (Specialty Cleaning and Restoration stream)
- Often checking content on tablets or phones on a worksite
- Value professional credibility and verifiable credentials

---

## CARSI's Unique Position

CARSI is the only LMS in Australia that:

1. Natively tracks **IICRC Continuing Education Credits (CECs)** per student
2. Maps courses to **CPP40421 units of competency** (Specialty Cleaning and Restoration)
3. Issues publicly verifiable, LinkedIn-shareable credentials referencing both IICRC and the national training framework

---

## IICRC Context

**IICRC** (Institute of Inspection, Cleaning and Restoration Certification) is the global standard-setting body for the cleaning and restoration industry.

**Relevant IICRC disciplines covered by CARSI:**

- **WRT** — Water Restoration Technician
- **CRT** — Carpet Repair Technician
- **OCT** — Odour Control Technician
- **ASD** — Applied Structural Drying
- **CCT** — Commercial Carpet Maintenance Technician
- _(Additional disciplines to be confirmed with Phill)_

**IICRC CECs** are Continuing Education Credits required to maintain IICRC certification. CARSI courses are CEC-accredited — meaning completing a CARSI course earns CECs toward IICRC recertification.

**CPP40421 — Certificate IV in Cleaning (Specialty Cleaning and Restoration)**
Australian nationally recognised qualification on training.gov.au. Where a CARSI course maps to a unit of competency in CPP40421, that mapping is surfaced to the student.

---

## Design Decisions

### 1. Engagement Strategy: Achievement-Focused

Chosen over:

- Progress-focused (too passive)
- Community-focused (v2 item)

Rationale: Trades professionals respond to **proof of competency** — not gamification. Certificates, CEC credits, and verifiable credentials are inherently motivating for this audience.

### 2. Achievement Engine: Event-Driven (Built-in from Day 1)

Architecture: Every significant student action fires a typed event into Redis. A FastAPI background worker (Celery-compatible) processes events asynchronously.

**Event types:**

```
LessonCompleted  → { student_id, lesson_id, course_id, time_spent_seconds }
QuizPassed       → { student_id, quiz_id, score_pct, course_id }
CourseCompleted  → { student_id, course_id, iicrc_discipline, cec_hours }
```

**Worker actions on event:**

1. Add CECs to student's ledger (`cec_transactions` table)
2. Check badge criteria → unlock badges
3. Trigger certificate PDF generation
4. Create public credential record

Rationale for built-in approach: The NodeJS-Starter-V1 already ships with Redis. LangGraph handles async orchestration. Bolting achievements on later would require retrofitting event hooks throughout the codebase.

### 3. Theme System: Dual Mode, Student Choice

- **Default:** Clean Professional (light mode) — white, CARSI brand colours, high contrast
- **Alternate:** Scientific Luxury (dark mode) — OLED black, high-contrast accents
- Preference saved server-side per user — consistent across devices
- Mobile-first — large tap targets, worksite-usable

### 4. UI Architecture: Three Dashboard Zones

**Student Dashboard:**

- My Learning (continue where you left off)
- My Credentials (CEC ledger, certificates, CPP40421 progress map)
- My Notes (per-lesson notes across all courses)

**Instructor Dashboard:**

- Course Builder (with Google Drive file picker)
- Student Analytics per course (completion rate, quiz scores, time on lesson)
- Certificate Management

**Admin Panel:**

- User management (role assignment, account suspension)
- Course approval workflow
- Platform-wide metrics (total CECs issued, completion rates by discipline)

---

## Enhancement Specifications

### Enhancement 1: IICRC CEC Tracking

**Database additions:**

```sql
-- Course-level metadata
ALTER TABLE courses ADD COLUMN iicrc_discipline VARCHAR(10);   -- e.g. 'WRT', 'CRT'
ALTER TABLE courses ADD COLUMN cec_hours NUMERIC(5,1);         -- CECs awarded on completion
ALTER TABLE courses ADD COLUMN cppp40421_unit_code VARCHAR(20); -- e.g. 'CPPCLO4027'
ALTER TABLE courses ADD COLUMN cppp40421_unit_name TEXT;

-- Student CEC ledger
CREATE TABLE cec_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    iicrc_discipline VARCHAR(10),
    cec_hours NUMERIC(5,1),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    certificate_id UUID  -- FK to certificates table
);
```

**Student-facing:**

- CEC total prominently displayed on dashboard
- Per-discipline breakdown (14 CECs in WRT, 8 CECs in CRT)
- Year filter (IICRC recertification is annual)

---

### Enhancement 2: Certificate System

**Generation:** WeasyPrint (Python) — no external service, no subscription cost, full brand control.

**Certificate PDF contains:**

- CARSI logo and branding
- Student full name
- Course title
- IICRC discipline code + CEC hours awarded
- CPP40421 unit code and name (where applicable)
- Date of completion
- Unique credential ID
- Verification URL: `https://carsi.com.au/credentials/{credential_id}`
- "This course is accredited for IICRC Continuing Education Credits"

**Storage:** Generated PDF stored in Google Drive under `CARSI-Certificates/{student_id}/` subfolder, linked back in the database.

**Database:**

```sql
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    credential_id VARCHAR(20) UNIQUE NOT NULL,  -- short human-readable ID
    pdf_drive_file_id VARCHAR(255),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_revoked BOOLEAN DEFAULT false
);
```

**Public verification endpoint:**
`GET /credentials/{credential_id}` — publicly accessible, no auth required.
Returns: student name, course, discipline, CECs, issue date, valid/revoked status.

---

### Enhancement 3: LinkedIn Share

On the Credentials Wallet page, each certificate has a **"Share on LinkedIn"** button.

Opens LinkedIn's certification form pre-filled:

```
Certification name: {course_title} ({iicrc_discipline})
Issuing organisation: CARSI
Issue date: {month} {year}
Expiry: (optional — leave blank or set if course has expiry)
Credential ID: {credential_id}
Credential URL: https://carsi.com.au/credentials/{credential_id}
```

Implementation: `window.open()` with LinkedIn URL parameters. No LinkedIn API required.

---

### Enhancement 4: Student Notes

**Per-lesson notes panel** — collapsible sidebar in the lesson player.

```sql
CREATE TABLE lesson_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id),
    lesson_id UUID REFERENCES lessons(id),
    content TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, lesson_id)
);
```

Notes are private to the student. Displayed in the lesson player and aggregated in the student dashboard under "My Notes."

---

### Enhancement 5: Offline Lesson Caching (PWA)

The Next.js frontend is configured as a **Progressive Web App** with a service worker that caches the current lesson's content (text, Drive-embedded PDFs).

- Student can install CARSI as an app on mobile/tablet
- If connectivity drops mid-lesson (on-site), the lesson remains usable
- Cache strategy: network-first with offline fallback for lesson content

---

### Enhancement 6: Credentials Wallet UI

Single screen showing all earned credentials:

- Filter by year, discipline
- Each credential card: course name, discipline badge, CECs earned, issue date
- Actions: Download PDF, Copy URL, Share to LinkedIn
- Summary row: total CECs this year, disciplines covered

---

## What Is NOT in Scope (YAGNI)

| Feature                         | Reason deferred                          |
| ------------------------------- | ---------------------------------------- |
| Community discussion forums     | v2 — avoid scope creep at launch         |
| AI chatbot tutor                | v2 — Ollama/LangGraph ready when needed  |
| Live webinar / Zoom integration | v2                                       |
| Payment / ecommerce             | Separate phase, after core LMS is stable |
| Cohort / group enrolment        | v2                                       |
| Bulk CSV student import         | v2                                       |

---

## Revised Phase Plan (with Enhancements)

| Phase  | Focus                                   | Enhancement Added                                            |
| ------ | --------------------------------------- | ------------------------------------------------------------ |
| 0      | Foundation                              | —                                                            |
| 1      | Database schema                         | + cec_transactions, certificates, lesson_notes tables        |
| 2      | ORM Models                              | + Certificate, CECTransaction, LessonNote models             |
| 3      | Auth / Roles                            | —                                                            |
| 4      | Course API                              | + iicrc_discipline, cec_hours, cppp40421 fields on Course    |
| 5      | Google Drive                            | + Certificate PDF storage in Drive                           |
| 6      | Course Catalog                          | —                                                            |
| 7      | Enrolment                               | —                                                            |
| **8**  | **Achievement Engine**                  | **NEW — event pipeline, CEC ledger, certificate generation** |
| 9      | Student Dashboard                       | + CEC counter, Credentials Wallet, Notes                     |
| 10     | Lesson Player                           | + Notes panel, offline caching (PWA)                         |
| 11     | Quiz Engine                             | —                                                            |
| 12     | Instructor Tools                        | + Student analytics per course                               |
| 13     | Admin Panel                             | —                                                            |
| **14** | **LinkedIn Share + Public Credentials** | **NEW — credential verification URL, LinkedIn button**       |
| **15** | **Theme System**                        | **NEW — dark/light toggle, mobile-first polish**             |

---

## Success Metrics (Post-Launch)

- Course completion rate > 60% (industry average: ~15%)
- CECs issued per month (tracking growth)
- LinkedIn shares per week (organic marketing signal)
- Mobile session percentage (target: > 40%)

---

_Design approved 2026-03-03. Next step: update implementation plan (writing-plans skill)._
