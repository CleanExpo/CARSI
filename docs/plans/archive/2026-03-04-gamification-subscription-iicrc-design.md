# CARSI LMS — Gamification, Subscription & IICRC CEC Reporting Design

**Date:** 04/03/2026
**Status:** Approved — ready for implementation
**Locale:** en-AU | Currency: AUD | Timezone: AEST/AEDT

---

## Overview

Three interconnected features centred on a single goal: **professional identity and ownership for Australian restoration technicians.**

1. **Gamification** — XP, levels, streaks, and a leaderboard tied to professional recognition
2. **Yearly Subscription ($795 AUD/year)** — all-course access with 7-day free trial via Stripe
3. **IICRC CEC Reporting Automation** — per-completion email to IICRC Las Vegas when a student holds an IICRC member number

---

## Business Context

- CARSI students are **IICRC-certified restoration technicians** — their CEC completions have real professional consequences
- The $795/year subscription aligns with **NRPG (National Restoration Professionals Group) membership prerequisites**
- Gamification serves **professional pride**, not entertainment — each level title maps to an industry grade
- IICRC CECs expire on a 3-year renewal cycle — students need to track how many they've earned vs. how many they still need

---

## Feature 1: Professional Identity Dashboard + Gamification

### XP + Level System

| Level | XP Required | Industry Title    |
| ----- | ----------- | ----------------- |
| 1     | 0           | Apprentice        |
| 2     | 500         | Trainee           |
| 3     | 1,500       | Technician        |
| 4     | 3,500       | Senior Technician |
| 5     | 7,000       | Specialist        |
| 6     | 12,000      | Master Restorer   |

**XP Award Table:**

| Event                        | XP  |
| ---------------------------- | --- |
| Lesson completed             | 10  |
| Quiz passed                  | 25  |
| Quiz perfect score (100%)    | 50  |
| Course completed             | 100 |
| Daily study streak (per day) | 5   |

### Streak Tracker

- Consecutive days with at least one lesson completed
- Resets at midnight AEST if no activity
- Visible on the student dashboard with a flame icon and day count
- Bonus: streaks of 7+, 30+, and 100+ days earn streak milestone XP bonuses (50, 200, 500 XP)

### Leaderboard

- Top 20 students by XP in the current calendar month
- Filter by IICRC discipline (WRT / CRT / OCT / ASD / CCT / All)
- Anonymous by default; students can opt in to display their real name
- Resets monthly — prior month standings archived

### IICRC Identity Card (Dashboard Centrepiece)

The student dashboard is a **Professional Identity Hub**:

- IICRC member card image upload (stored in Google Drive, linked via URL)
- IICRC member number (entered by student, verified by admin)
- Disciplines held (e.g. WRT, CRT) + certification dates
- IICRC renewal expiry date
- **CEC Progress Ring:** CECs earned this renewal period vs. CECs required (standard: 8 CECs per 3-year cycle)
- Next recommended courses (based on discipline gaps and pathway)
- "Pro Subscriber" badge if active subscription
- NRPG membership status indicator (future)

### Database Changes

**`lms_users` — new columns:**

```sql
iicrc_member_number   VARCHAR(20)
iicrc_card_image_url  TEXT
iicrc_expiry_date     DATE
iicrc_certifications  JSONB  -- [{"discipline": "WRT", "certified_at": "2024-01-15"}]
```

**New table `lms_xp_events`:**

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id      UUID REFERENCES lms_users(id) ON DELETE CASCADE
source_type     VARCHAR(50)  -- lesson_completed|quiz_passed|quiz_perfect|course_completed|streak_bonus
source_id       UUID         -- the lesson/quiz/course that triggered it
xp_awarded      INTEGER NOT NULL
earned_at       TIMESTAMPTZ DEFAULT now()
```

**New table `lms_user_levels`:**

```sql
student_id      UUID PRIMARY KEY REFERENCES lms_users(id) ON DELETE CASCADE
total_xp        INTEGER DEFAULT 0
current_level   INTEGER DEFAULT 1
current_streak  INTEGER DEFAULT 0
longest_streak  INTEGER DEFAULT 0
last_active_date DATE
```

---

## Feature 2: Yearly Subscription — $795 AUD/year

### Model

- Alongside per-course pricing (not replacing it)
- Subscribed students have all-course access without individual enrolment
- 7-day free trial (Stripe `trial_period_days: 7`)
- After trial, $795 AUD/year charged automatically

### Stripe Configuration

- **Product:** "CARSI Professional Subscription"
- **Price:** $795.00 AUD, recurring annually
- **Trial:** 7 days free, card required at signup
- **Portal:** Stripe Customer Billing Portal for self-service cancellation and card management

### Webhook Handler — `POST /api/lms/webhooks/stripe`

| Stripe Event                           | Action                                                        |
| -------------------------------------- | ------------------------------------------------------------- |
| `customer.subscription.created`        | Create `lms_subscription` row, `status=trialling` or `active` |
| `customer.subscription.trial_will_end` | Email student 3 days before trial ends                        |
| `invoice.payment_succeeded`            | Set `status=active`, extend `current_period_end`              |
| `customer.subscription.deleted`        | Set `status=cancelled`                                        |
| `invoice.payment_failed`               | Set `status=past_due`, email student                          |

### Database — new table `lms_subscriptions`

```sql
id                       UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id               UUID REFERENCES lms_users(id) ON DELETE CASCADE
stripe_subscription_id   VARCHAR(255) UNIQUE NOT NULL
stripe_customer_id       VARCHAR(255) NOT NULL
status                   VARCHAR(50) DEFAULT 'trialling'
  -- trialling | active | past_due | cancelled | unpaid
plan                     VARCHAR(50) DEFAULT 'yearly'
current_period_start     TIMESTAMPTZ
current_period_end       TIMESTAMPTZ
trial_end                TIMESTAMPTZ
cancelled_at             TIMESTAMPTZ
created_at               TIMESTAMPTZ DEFAULT now()
```

### Access Control

`require_access(course)` dependency checks (in order):

1. Student has active subscription → **allow**
2. Student has an active enrolment for this course → **allow**
3. Otherwise → return 402 Payment Required

### Student Experience

1. Student visits any course or the `/subscribe` pricing page
2. Clicks "Start 7-Day Free Trial"
3. Stripe Checkout opens (card required, no charge yet)
4. Trial starts → all courses unlocked immediately
5. 3 days before trial ends → email reminder
6. Day 7 → $795 AUD charged automatically
7. Student can cancel anytime via "Manage Subscription" in their dashboard

---

## Feature 3: IICRC CEC Reporting Automation

### Trigger

`COURSE_COMPLETED` event → Celery worker checks:

- Does this student have an `iicrc_member_number`?
- Does the course have `cec_hours > 0` and `iicrc_discipline` set?
- Has this completion already been reported (check `lms_cec_reports`)?

If all conditions met → send CEC report email.

### Email Format

```
To:      cec@iicrc.org  [CONFIRM EXACT ADDRESS WITH IICRC]
From:    admin@carsi.com.au
Subject: CEC Completion Report — [Member Name] — [Course Title]

Dear IICRC CEC Department,

Please record the following Continuing Education Credit completion:

Member Name:      [student.full_name]
IICRC Member #:   [student.iicrc_member_number]
Email:            [student.email]

Course:           [course.title]
IICRC Discipline: [course.iicrc_discipline]
CEC Hours:        [course.cec_hours]
Completion Date:  [DD/MM/YYYY AEST]

Course Provider:  CARSI — Restoration Courses & Training Online
Provider Contact: admin@carsi.com.au
Provider Website: carsi.com.au

This completion has been recorded in CARSI system.
Certificate ID: [certificate.id]

Kind regards,
CARSI Administration
```

### Retry Logic

- Email failure → retry after 5 min, then 30 min, then 2 hours (3 attempts total)
- After 3 failures → `status=failed`, admin notification email sent

### Database — new table `lms_cec_reports`

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
cec_transaction_id  UUID REFERENCES lms_cec_transactions(id)
student_id          UUID REFERENCES lms_users(id)
iicrc_member_number VARCHAR(20) NOT NULL
email_to            VARCHAR(255) NOT NULL
status              VARCHAR(20) DEFAULT 'pending'
  -- pending | sent | failed
sent_at             TIMESTAMPTZ
error_message       TEXT
retry_count         INTEGER DEFAULT 0
created_at          TIMESTAMPTZ DEFAULT now()
```

### Admin Visibility

Admin dashboard → "CEC Reports" tab shows:

- All submissions (sent / pending / failed)
- Ability to manually retry failed submissions
- Export to CSV for IICRC correspondence

---

## Architecture Summary

### New Backend Files

| File                                                | Purpose                                        |
| --------------------------------------------------- | ---------------------------------------------- |
| `alembic/versions/003_gamification_subscription.py` | DB migration                                   |
| `src/api/routes/lms_subscription.py`                | Subscription CRUD + Stripe checkout            |
| `src/api/routes/lms_webhooks.py`                    | Stripe webhook handler                         |
| `src/api/routes/lms_gamification.py`                | XP events, leaderboard, level                  |
| `src/services/email_service.py`                     | SMTP email sender (Mailpit dev, Resend prod)   |
| `src/services/iicrc_reporter.py`                    | CEC report email builder                       |
| `src/worker/tasks.py`                               | Extend with XP award + CEC report Celery tasks |

### Modified Backend Files

| File                         | Change                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `src/db/lms_models.py`       | Add LMSSubscription, LMSXPEvent, LMSUserLevel, LMSCECReport + columns on LMSUser |
| `src/api/deps_lms.py`        | Add `require_access(course)` dependency                                          |
| `src/api/routes/__init__.py` | Register new routers                                                             |
| `src/api/main.py`            | Include new routers                                                              |

### New Frontend Files

| File                                           | Purpose                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `app/(dashboard)/student/page.tsx`             | Professional Identity Dashboard (full rebuild) |
| `app/(public)/subscribe/page.tsx`              | Subscription pricing + trial CTA               |
| `app/(dashboard)/student/leaderboard/page.tsx` | Monthly XP leaderboard                         |
| `components/lms/IICRCIdentityCard.tsx`         | Member card display                            |
| `components/lms/CECProgressRing.tsx`           | SVG progress ring                              |
| `components/lms/XPLevelBadge.tsx`              | Level + XP display                             |
| `components/lms/StreakTracker.tsx`             | Streak flame + counter                         |
| `components/lms/SubscriptionStatus.tsx`        | Trial/active/cancelled badge                   |

---

## Success Criteria

1. **Gamification:** Student dashboard shows XP, level title, streak count, and leaderboard rank
2. **IICRC Identity:** Students can enter their IICRC member number and see their CEC progress ring
3. **Subscription:** `POST /api/lms/subscription/checkout` returns a Stripe Checkout URL; webhook updates subscription status correctly
4. **CEC Reporting:** Within 60 seconds of course completion, if student has IICRC member number, an email is sent to IICRC Las Vegas and recorded in `lms_cec_reports`
5. **Access Control:** Subscribed students can access all published courses without individual enrolment

---

## Open Questions (Confirm Before Go-Live)

1. **IICRC email address** — confirm the exact CEC submission email with IICRC America (assumed `cec@iicrc.org`)
2. **IICRC report format** — confirm IICRC is happy with email-per-completion (vs. monthly batch)
3. **Stripe keys** — `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` need to be added to `.env.local`
4. **From email domain** — `admin@carsi.com.au` needs SPF/DKIM configured for deliverability to IICRC
5. **NRPG proof format** — what format does NRPG require as proof of active subscription?
