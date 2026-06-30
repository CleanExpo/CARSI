# spec.md — CCW Roadshow: fix calendar invites + per-city signup routing + add-to-calendar button

**Date:** 2026-06-30 · **Author:** agent (founder-approved scope) · **Repo:** CleanExpo/CARSI @ origin/main
**Status:** approved — proceed to build

## Problem (verified, not assumed)

The "CCW Roadtrip" = **CARSI × CCW Business Growth Days**, two free city events:
Melbourne (22–23 Jul 2026, cap 10) and Sydney (30–31 Jul 2026, cap 12). The two
"marketing campaigns" are these two city events, surfaced via the `/ccw-melbourne`
and `/ccw-sydney` vanity QR pages, both rendered from one shared system. Signup is
**public lead-capture (no login by design)**; on a confirmed registration the app
adds the registrant as a guest to a pre-existing Google Calendar event so Google
emails them an invite.

Two findings, both verified against the live Google Calendar (`phill.mcgurk@gmail.com`):

1. **🔴 Calendar invites are silently broken for BOTH cities.** The `calendarEventId`
   values hardcoded in `src/lib/marketing/ccw-roadshow.ts` do not exist:
   - Melbourne `fvuaa6bo5muljkdaorpp17lndk` → real event is `1d1uqjm6an36n1kgc6s4s3ln7s`
   - Sydney `4nut26p4pg0i46mb0kh32if3l8` → real event is `h6qm8t3muuv44ht9gqann5dhuk`
   `addRegistrationToCalendar()` is a deliberate silent no-op on failure, so every
   signup to either city fails to add the guest. Both events have zero attendees.

2. **🟡 "Toby's marketing details" gap.** The system is single-tenant: both cities are
   hardcoded to Phill, and **no organizer notification email is sent for either city.**
   There is no per-campaign field for Toby's details. Toby = CCW rep, email
   `tobyb@ccwarehouse.com.au` (from the standing Unite-Group↔CCW calendar invite).

## Decisions (founder-selected, batched)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Per-campaign scope | **Fix calendar + minimal notification routing only** — no on-page organizer branding / per-city reply-to identity. |
| 2 | Sydney signup notifications | **Toby + Phill** (`tobyb@ccwarehouse.com.au`, `phill.mcgurk@gmail.com`). Melbourne → Phill only. |
| 3 | Calendar source | **Keep both on Phill's calendar** — correct the stale IDs only. |
| 4 | Success-page button | **Yes** — add self-serve "Add to Calendar" (Google link + .ics). |

> Reconciliation note: Q1 ("just fix calendar") sets the *identity/branding* scope to
> minimal; Q2 ("Toby + you") is the explicit instruction to build signup-notification
> routing. Resolved as: build notification routing, skip page-branding work.

## Scope

**In:** (a) correct both `calendarEventId`s; (b) server-side per-city organizer
notification email on confirmed/waitlisted signup; (c) self-serve add-to-calendar
block on the success page.
**Out:** on-page organizer branding, per-city reply-to identity, moving Sydney to a
separate calendar, any login/auth on signup (none by design), Stripe path changes.

## Design

- **Calendar IDs** — data-only edit in `src/lib/marketing/ccw-roadshow.ts`
  (Melbourne→`1d1uqjm6an36n1kgc6s4s3ln7s`, Sydney→`h6qm8t3muuv44ht9gqann5dhuk`).
  Locked by a regression test asserting the exact IDs.
- **Notify routing** — NEW server-only `src/lib/server/ccw-roadshow-notify.ts`:
  `getRoadshowNotifyRecipients(slug)` → defaults `{melbourne:[phill], sydney:[toby,phill]}`,
  overridable via env `CCW_ROADSHOW_NOTIFY_MELBOURNE` / `CCW_ROADSHOW_NOTIFY_SYDNEY`
  (comma-separated). Kept server-only because `ccw-roadshow.ts` is client-imported
  (`CcwRoadshowBooking.tsx`) — Toby's email must not ship in the client bundle.
  New `sendCcwRoadshowOrganizerNotificationEmail()` in `transactional-email.ts`
  (lightweight internal template) called from the checkout route after the attendee
  email, in its own non-fatal try/catch. Rides the existing Mailtrap transport —
  **no new infra**: if attendee confirmations deliver in prod, this does too.
- **Add-to-calendar** — NEW pure `src/lib/marketing/ccw-roadshow-calendar-links.ts`:
  `buildGoogleCalendarLink(event)` + `buildIcsContent(event)` from the event config
  (startDateIso/endDateIso/venue). Success page reads the `event` slug it already
  receives, resolves the event, and renders the block for non-waitlisted confirmations
  (Google template link + `data:text/calendar` .ics download — works without JS).

## Verification

- `npm run type-check` clean · `npx eslint .` 0/0 · `npm run test:unit` green (incl. new tests) · `npm run build` compiles.
- New unit tests: calendar-links (Google URL params + VEVENT/DTSTART/DTEND/SUMMARY),
  notify resolver (defaults + env override + unknown slug), calendar-ID regression lock.
- Live (post-deploy): test registration for **Melbourne** (notifies Phill only — avoids
  emailing Toby) with `phill.mcgurk+ccwtest@gmail.com`; confirm via Calendar API that the
  guest was added to `1d1uqjm6an36n1kgc6s4s3ln7s`; then remove the test guest. Proves the
  end-to-end calendar add for real.

## Risks / residual

- **Prod env dependency (unverifiable from here):** calendar delivery needs
  `GOOGLE_CALENDAR_CLIENT_ID/SECRET/OAUTH_REFRESH_TOKEN`; email needs `MAILTRAP_API_KEY`.
  The live test above is the real proof; if it fails to add the guest, the residual cause
  is missing prod creds (route via DO console / Rana, like #137).
- Multi-day event rendered as one spanning entry in the button (8:30 day1 → 16:30 day2),
  clarified in the description. Acceptable for a convenience button.
- main = prod via DO deploy-on-push; ship via PR → squash-merge → DO deploy.

## Acceptance criteria

1. Both cities' `calendarEventId` match the real Google events (regression-locked).
2. A confirmed Sydney signup emails Toby + Phill; Melbourne emails Phill only (env-overridable).
3. Success page shows a working Add-to-Calendar (Google + .ics) for confirmed registrations.
4. Gate green (type-check, lint, unit, build); live Melbourne test registration adds the guest to the calendar.
