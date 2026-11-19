# Analytics events (Phase 5)

Stable `data-carsi-event` names. Clicks are collected app-wide by `CarsiProductEventCollector` in `app/layout.tsx`, sending to **GA4** (`gtag`) and **PostHog** (when `NEXT_PUBLIC_POSTHOG_KEY` is set), using the same queue rules as funnel events.

| Event                  | When                              | `data-carsi-context` example                         |
| ---------------------- | --------------------------------- | ---------------------------------------------------- |
| `course_cta`           | Role guide start-here course card | `role-guide:commercial-cleaning-contractors:start-1` |
| `coaching_cta`         | Coaching / CCW secondary card     | `role-guide:nsw-builders`                            |
| `role_guide_start`     | Hub entry (future)                | `hub`                                                |
| `marketing_pack_build` | Pack build button (future)        | `coaching-marketing`                                 |

Constants: `src/lib/analytics/carsi-events.ts`.
