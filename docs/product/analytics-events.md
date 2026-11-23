# Analytics events (Phase 5)

Stable `data-carsi-event` names. Clicks are collected app-wide by `CarsiProductEventCollector` in `app/layout.tsx`, sending to **GA4** (`gtag`) and **PostHog** (when `NEXT_PUBLIC_POSTHOG_KEY` is set) **only after cookie consent (GP-731)**. Event names and params (`carsi_context`, `link_path`) are on the same allow-list as funnel events in `src/lib/analytics/consent.ts`.

| Event                  | When                              | `data-carsi-context` example                         |
| ---------------------- | --------------------------------- | ---------------------------------------------------- |
| `course_cta`           | Role guide start-here or catalogue card | `role-guide:commercial-cleaning-contractors:start-1`, `catalogue:water-damage-restoration-fundamentals` |
| `coaching_cta`         | Coaching / CCW secondary card     | `role-guide:nsw-builders`                            |
| `role_guide_start`     | Hub entry (future)                | `hub`                                                |
| `marketing_pack_build` | Pack build button                 | `coaching-marketing`                                 |
| `employer_trust_cta`   | Employer / manager trust card     | `role-guide:nsw-builders:employer-2`                 |

Constants: `src/lib/analytics/carsi-events.ts`.
