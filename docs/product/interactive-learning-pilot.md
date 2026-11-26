# Interactive restoration learning — water damage pilot

## Summary

CARSI’s first **interactive learning experience** ships as a lesson resource on **Water Restoration Practitioner** Module 3, lesson _Identify the hazards first_. It replaces passive reading-only study with six connected activities aligned to existing course copy and diagrams.

**Advisor hub (all disciplines):** `/interactive-learning`  
**Public experience (water, live):** `/interactive-learning/water-damage-module-3-pilot`  
**Legacy redirect:** `/courses/water-damage-restoration-fundamentals/interactive-pilot`  
**Enrolled path:** `/dashboard/learn/water-damage-restoration-fundamentals` → Module 3 → _Identify the hazards first_

## Activities

| Step | Activity                        | Learning intent                                                                                       |
| ---- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1    | **Job-site scenario** (3 steps) | Hazard-first arrival, electrical isolation, job-file basics                                           |
| 2    | **Clickable hazard map**        | Explore `hazard-map.svg` hotspots (electrical, structural, slip, chemical, biological, confined/heat) |
| 3    | **Hazard identification**       | Multi-select present hazards on the Melbourne garage job                                              |
| 4    | **Decision simulator**          | Professional response to customer pressure vs safety                                                  |
| 5    | **Sequence challenge**          | Order the restoration arc on arrival                                                                  |
| 6    | **Knowledge check**             | Category 1 judgement for sanitary burst water                                                         |

**Gamification:** activity XP (max 100) and a progress bar — professional tone, no childish chrome.

**Mastery gates:** scenario steps require the safe/correct choice before advancing; hazard, decision, sequence and knowledge activities award XP only on a correct outcome (with retry). Activities unlock in order — learners cannot skip ahead. Completing all six scrolls to the lesson footer and highlights **Mark complete**.

## Progress and completion

| Data                                                 | Storage                                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Activity completion, XP, current activity tab        | `localStorage` key `carsi-interactive:v2:{experienceId}:{lessonId}` (migrates v1), merged with server on load |
| Durable cross-device progress                        | `lms_lesson_progress.interactive_progress` JSON via `GET`/`PUT` `/api/lms/lessons/{id}/interactive-progress` |
| Lesson / course completion                           | **Mark lesson complete** only after server evidence: all activities mastered (GP-432) or quiz passed          |

The experience does **not** auto-complete the lesson. Completing all activities shows inline guidance; **Mark lesson complete** flushes interactive progress then `PATCH`es progress.

## Fire & smoke pilot (live)

- **Experience id:** `fire-smoke-module-3-pilot`
- **Course:** `fire-smoke-damage-restoration-fundamentals`
- **Lesson anchor:** _Asbestos in fire-damaged buildings_ (Module 3)
- **Public demo:** `/interactive-learning/fire-smoke-module-3-pilot`

## Technical architecture

- **Resource kind:** `interactive` in `LmsLesson.resources` JSON, resolved via `experienceId` in `src/lib/lms/interactive-experience-registry.ts`
- **Parser:** `parseLessonResources` + `parseInteractiveLessonResource`
- **API merge:** `mergeLessonInteractivePilots` on lesson GET (water + fire pilots) so DB rows without catalog resources still receive live experiences
- **Server sync:** `InteractiveExperiencePlayer` debounces `PUT`; lesson GET returns `interactive_progress` to skip an extra round trip
- **UI:** `InteractiveExperiencePlayer` + `InteractiveActivityView` (reusable for future `experienceId` bundles)
- **Catalog:** `data/courses/water-damage-restoration-fundamentals/v1-draft/courses-catalog.json` includes the resource for re-import

## Traditional vs interactive (this lesson)

| Traditional                                    | With pilot                                     |
| ---------------------------------------------- | ---------------------------------------------- |
| Read HTML lesson + static hazard diagram image | Same lesson content, plus guided investigation |
| Module check quiz at end only                  | Practice decisions throughout the lesson       |
| No in-lesson feedback on judgement             | Contextual feedback on each choice             |
| Progress = scroll / manual complete            | Activity XP + local resume                     |

## Testing

- `src/lib/lms/append-interactive-pilot.test.ts`
- `src/lib/lms/interactive-experience-parse.test.ts`
- Manual: public demo page + enrolled Module 3 lesson in dev

## Expansion recommendations

1. Register additional `experienceId` bundles (moisture instruments, drying levers) reusing the same components.
2. Attach activities to preview lessons for marketing (with disclaimer).
3. Optionally persist activity checkpoints in `lesson_checkpoint` JSON once schema is agreed (localStorage is sufficient for pilot).
4. Add product analytics event when Phase 5 allow-list includes LMS events.

## Safety

All copy reinforces WHS hierarchy, 230 V / RCD / isolation, and simulation disclaimers. No invented CEC claims or standard text reproduction.
