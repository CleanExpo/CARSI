# CARSI Customer Journey & Retention Loop

Updated: 18/06/2026

## Core Loop

CARSI should guide every learner and team through the same repeatable loop:

1. Discover the learner goal, trade problem, team need, or CEC deadline.
2. Choose the shortest credible course or pathway.
3. Enrol with clear individual/team access.
4. Start the first lesson immediately.
5. Return through resume links, reminders, and progress cues.
6. Convert completion into certificate and CEC evidence.
7. Recommend the next course, team rollout, or renewal action.

## Implemented Now

- Shared loop data in `src/lib/customer-journey-loop.ts`.
- Shared brand video assistant scripts in `src/lib/brand-video-assistant.ts`.
- Public pathway advisor on `/pathways`.
- Primary nav can safely include `Pathways` again because the page now has a real chooser.
- `/courses` routes unsure visitors to the guided advisor.
- Student dashboard includes a next-best-action momentum panel.
- Enrolment welcome email now names the next action and reinforces resume/certificate/next-course behaviour.
- Video assistant production plan in `docs/plans/2026-06-18-carsi-video-assistant-production-pack.md`.

## Public Journey Enhancements

### Pathway Advisor

The advisor should remain the default answer to "I do not know where to start."

Current options:

- New operator
- CEC renewal
- Water damage
- Team owner
- Facility risk

Each option gives:

- Best-fit audience.
- Recommended disciplines.
- First action.
- Retention cue.
- Primary and secondary CTA.

### Catalogue

The catalogue should not assume visitors can choose correctly. Keep a visible pathfinder prompt above course filters.

### Course Detail Pages

Next recommended enhancement:

- Who this course is for.
- What you will be able to do after.
- Time required.
- CEC value.
- Prerequisites.
- Individual vs team enrolment.
- Certificate/verification outcome.
- Next recommended course.

## Logged-In Retention Enhancements

### Dashboard

The learner dashboard should always show one next best action:

- Resume last lesson.
- Choose first pathway.
- Generate certificate.
- Pick next recommendation.

## Video Assistant Layer

Use HeyGen, ElevenLabs, and Remotion to reinforce the loop at high-intent moments.

Recommended placements:

- Homepage: CARSI introduction.
- Pathways: "choose your path" explainer.
- Courses: "not sure where to start?" prompt.
- RestoreAssist: field-support introduction.
- NRPG/disaster recovery: professional readiness introduction.
- Dashboard: resume and certificate nudges.
- Team dashboard: weekly progress explanation.

Rules:

- No autoplay on public pages.
- Captions and transcript required.
- One video equals one next action.
- RestoreAssist is positioned as field support, not a replacement for professional judgement.
- NRPG/disaster recovery claims must stay evidence-led and avoid unsupported compliance promises.

### Lifecycle Email Triggers

Add these once scheduling/email orchestration is ready:

- Day 0: enrolment welcome with lesson 1 CTA.
- Day 3: first-module reminder if no progress.
- Day 7: progress reminder with resume link.
- 50% progress: midpoint encouragement and certificate expectation.
- 80% progress: finish push.
- Completion: certificate/share prompt.
- 30 days after completion: next-course recommendation.
- Team weekly: owner progress summary with stalled learners and seats used.

## Team Retention Enhancements

Team owners should see:

- Seat usage.
- Invites pending.
- Learners not started.
- Learners stalled for 7+ days.
- Completions and certificate count.
- Suggested next assignment.

## Analytics Events To Add

Use these event names across the public and logged-in journey:

- `pathway_advisor_viewed`
- `pathway_advisor_option_selected`
- `pathway_advisor_primary_cta_clicked`
- `catalogue_pathfinder_clicked`
- `course_detail_enrol_cta_clicked`
- `enrolment_confirmed`
- `lesson_one_started`
- `resume_cta_clicked`
- `certificate_generated`
- `next_course_clicked`
- `team_invite_sent`
- `team_member_started`
- `team_member_completed`

## Acceptance Criteria

- A new visitor can choose a path without understanding IICRC codes.
- A learner who enrols receives an immediate first-lesson CTA.
- A logged-in learner always sees one next best action.
- A completed learner is pushed to certificate proof and next recommendation.
- A team owner can understand staff progress without opening each learner record.
