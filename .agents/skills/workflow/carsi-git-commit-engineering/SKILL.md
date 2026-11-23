---
name: carsi-git-commit-engineering
description: >-
  Authors CARSI git commits as readable engineering changelog entries with
  context, implementation, verification, and customer impact. Use when creating
  commits, drafting commit messages, preparing PRs, reviewing git history, or
  any time the user asks to commit changes.
---

# CARSI Git Commit Engineering

## Mission

CARSI Git history must serve as a permanent, readable engineering changelog.

A developer, founder or stakeholder should be able to read a commit and understand:

1. What changed?
2. Why was the change necessary?
3. How did the implementation change?
4. Which user experience or system behavior is affected?
5. What was verified?
6. What is the business or customer impact?

The reader should not need to open the source code to understand the purpose and scope of a meaningful commit.

Commit messages must be natural, detailed, technically accurate and written in the voice of an experienced software engineer.

When the user asks you to commit, read this skill first and follow it together with the repository git safety rules (no blind `git add .`, no secrets, no force-push without authorization).

---

## 1. Required commit format

Use:

`type(scope): descriptive summary`

Follow with a structured body:

**Context**  
Explain the original problem or requirement.

**Implementation**  
Describe what changed and how the new behavior works.

**Verification**  
Describe the tests and checks actually performed.

**Impact**  
Explain the effect on the customer, product or engineering system.

**References**  
Include the relevant Linear or GitHub issue when available.

Do not include empty sections.

### Example (feature — lesson completion)

```
feat(course-player): introduce interactive lesson completion experience

Context:
Completing a lesson provided limited feedback about what had been completed
and what the student should do next.

Implementation:
Reworked the lesson completion flow to give students clearer feedback when
they finish a lesson. The updated experience:
- Shows a clear completion state after a lesson is finished.
- Provides feedback without interrupting the learning journey.
- Makes the next lesson easier to discover.
- Preserves the existing course navigation experience.
- Handles repeated completion actions without duplicating progress.

Verification:
- Confirmed lesson completion updates correctly.
- Tested navigation to the next lesson.
- Checked mobile and desktop layouts.
- Ran relevant type checks and automated tests.

Impact:
Students receive a clearer completion experience and can continue their
training without unnecessary confusion.
```

---

## 2. Commit subject requirements

The subject must:

- Describe the actual change.
- Identify the affected feature or system.
- Use natural engineering language.
- Be understandable without opening source code.
- Avoid generic descriptions.

**Preferred:**

- `feat(course-player): introduce interactive lesson completion feedback`
- `fix(checkout): prevent duplicate course purchase submissions`
- `ui(student-dashboard): clarify course progress and learning activity`
- `refactor(course-catalog): separate course discovery from enrollment logic`
- `perf(course-player): reduce repeated lesson progress requests`
- `test(quizzes): cover unanswered questions and review navigation`

**Avoid:**

- `update code`, `fix some issues`, `improve functionality`, `final changes`
- `various improvements`, `AI generated updates`, `miscellaneous fixes`

---

## 3. Detailed commit body requirements

For meaningful features, bug fixes, architectural changes and significant UI work, explain:

### Context

What was happening before?

### Implementation

What behavior has changed?  
Which major components, workflows or system responsibilities were affected?  
What happens now?

### Verification

Which automated tests, browser scenarios, type checks or manual checks were performed?

Only report checks that actually ran and their real outcomes.

### Impact

What does this improve for students, instructors, administrators, restoration professionals or CARSI operations?

Do not invent benefits or claim measurable improvements without evidence.

---

## 4. Additional examples

### Bug fix — checkout

```
fix(checkout): prevent duplicate course purchases

Context:
Repeated checkout submissions could initiate duplicate purchase attempts.

Implementation:
The checkout flow now:
- Prevents repeated submissions while a request is processing.
- Provides clear feedback during payment processing.
- Preserves the existing Stripe checkout flow.
- Handles unsuccessful payment responses without granting access.

Verification:
- Tested repeated submission scenarios.
- Verified successful and unsuccessful payment handling.
- Checked course entitlement behavior.

Impact:
Reduces duplicate purchase attempts and protects the reliability of the
course purchasing experience.
```

### UI — student dashboard

```
ui(student-dashboard): make learning progress easier to understand

Context:
Progress and enrolled courses were harder to scan at a glance.

Implementation:
Changes include:
- Clearer visual hierarchy for enrolled courses.
- Improved progress indicators.
- Better separation of completed and ongoing courses.
- More consistent spacing and responsive layouts.

Verification:
- Reviewed desktop and mobile layouts.
- Checked progress data rendering.
- Verified existing dashboard navigation.

Impact:
Students can identify their learning progress and continue their training
more easily.
```

### Database

```
feat(database): track lesson completion timestamps

Context:
Lesson progress lacked a reliable per-lesson completion timestamp for
activity history and analytics foundations.

Implementation:
- Added the required completion timestamp field.
- Updated the relevant Prisma data model.
- Included the corresponding database migration.
- Preserved existing progress records.
- Updated affected application data operations.

Verification:
- Validated the Prisma schema.
- Reviewed migration behavior.
- Checked existing progress handling.

Impact:
CARSI can represent lesson completion more accurately and support future
learning analytics.
```

---

## 5. Rules enforced

| Rule           | Standard                                              |
| -------------- | ----------------------------------------------------- |
| Commit subject | Specific and understandable                           |
| Commit body    | Explain the actual implementation                     |
| Reason         | Explain why the change was necessary                  |
| Changes        | Describe important behavior and components            |
| Verification   | State what was actually tested                          |
| Impact         | Explain the customer or business benefit              |
| References     | Include ticket/issue IDs when available               |
| Accuracy       | Never claim tests passed unless executed              |
| Proportionality| Detail matches complexity (no 30-line msg for a typo) |

---

## 6. Commit grouping

- One commit should represent one logical engineering change.
- Group closely related implementation, tests and documentation.
- Keep unrelated features and fixes separate.
- Do not create meaningless commits for every file.
- Avoid giant commits containing unrelated work.
- Preserve existing commit authorship.
- Never rewrite shared history without authorization.

---

## 7. Git safety (before staging)

- Inspect `git status`.
- Identify the current branch.
- Review the complete diff.
- Identify unrelated changes.
- Stage only the intended files.
- Review the staged diff before committing.

Never blindly execute `git add .`  
Never include secrets, environment files or credentials.  
Never discard another contributor's modifications.  
Never amend, rebase, force-push or rewrite published commits without explicit authorization.

Follow repository-specific deployment and approval requirements.

---

## 8. Commit detail proportionality

| Change size              | Message depth                                      |
| ------------------------ | -------------------------------------------------- |
| Small doc typo           | Concise subject + one or two sentences             |
| Small bug fix            | Problem, correction, verification                |
| Feature implementation   | Context, behavior, verification, impact            |
| Architecture / database  | Responsibilities, data behavior, migration, compat |
| Large cross-functional   | Prefer multiple logical commits with full bodies   |

---

## 9. Final quality test

Before creating a commit, ask:

- Can someone understand the change from its subject?
- Does the body explain the original problem?
- Does it describe the actual implementation?
- Are verification statements accurate?
- Is the customer or engineering impact clear?
- Is the commit logically grouped?
- Does it read like a professional engineer wrote it?

If the answer is no, improve the commit message before committing.

---

## Golden rule

Git history is part of CARSI's engineering documentation.

A commit must explain the change, not merely announce that files were modified.

Write for the engineer who will investigate this decision six months from now.

This is a mandatory workflow skill for feature development, bug fixing, refactoring and maintenance in CARSI.