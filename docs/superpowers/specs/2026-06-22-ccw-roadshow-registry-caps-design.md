# CARSI x CCW Roadshow — Registry, Caps, Waitlist & Calendar Sync

**Date:** 2026-06-22
**Status:** Approved design — ready for implementation planning

## Context

The CARSI x CCW Business Growth Days roadshow runs two two-day events in
July 2026 (Melbourne 22–23 July, Sydney 30–31 July). Registration is free for
past and current Carpet Cleaners Warehouse customers.

Today the booking flow has no persistence: a submission only generates a
free-entry token and fires a CRM webhook (`roadshow.registration.created`).
Nothing counts registrations, nothing enforces a cap, and there is no queryable
registry. The form collects Name, Company, Email and Phone but not the
participant detail the business now needs.

This change adds:

1. **Per-city participant caps** — Melbourne 10, Sydney 12 (counted as people/seats).
2. **A real registry** capturing, per attendee: Name, Company, Phone, Years
   Experience, and what they want to achieve from the two days.
3. **A waitlist** — once a city is full, further registrations are accepted and
   flagged `waitlisted` rather than rejected.
4. **Google Calendar sync** — confirmed registrants are added as guests on the
   matching roadshow calendar event on `phill.mcgurk@gmail.com`.
5. **An admin view** to see the registry per city, export CSV, and promote
   waitlisted registrations.

The existing Unite-Group CRM webhook is **retained** and runs alongside the new
local database.

## Decisions (from brainstorming)

- **Storage:** new local Prisma/Postgres tables + in-app admin view + CSV export.
  The local DB is authoritative for the count and registry; the CRM webhook still fires.
- **Granularity:** keep the team option, but capture each person. Company + the
  booking contact (email, phone) are **shared** across a team; Name, Years
  Experience and Goals are captured **per seat**.
- **Years Experience:** banded dropdown — `0–1`, `2–5`, `6–10`, `11+` years. Required.
- **Goals** ("what they want to achieve"): required.
- **Cap behaviour:** waitlist (accept past cap, flag `waitlisted`).
- **Team + cap atomicity:** a registration is confirmed only if the **entire
  party** fits in the remaining seats; otherwise the whole party is waitlisted.
  Crews are never split across confirmed/waitlist.
- **Calendar:** add the booking contact as a guest on the matching city's Google
  Calendar event when the registration is confirmed. Waitlisted registrations are
  not added until promoted.

## Architecture

### 1. Event config — `src/lib/marketing/ccw-roadshow.ts`

Add to `CcwRoadshowEvent`:

- `capacity: number` — Melbourne `10`, Sydney `12`.
- `calendarEventId: string` — the Google Calendar event IDs already created on
  `phill.mcgurk@gmail.com`:
  - Melbourne: `1d1uqjm6an36n1kgc6s4s3ln7s`
  - Sydney: `h6qm8t3muuv44ht9gqann5dhuk`

This file remains the single source of truth for event metadata, caps, and the
calendar mapping.

Years-experience bands are defined here too (e.g. `ccwRoadshowExperienceBands`)
so the form, validation, and admin filter share one list.

### 2. Data model — `prisma/schema.prisma` + migration

Status lives on the registration so a team shares one status.

```prisma
model CcwRoadshowRegistration {
  id                String   @id @default(uuid()) @db.Uuid
  eventSlug         String   @map("event_slug") @db.VarChar(32)
  freeEntryToken    String   @unique @map("free_entry_token")
  companyName       String?  @map("company_name")
  contactEmail      String   @map("contact_email")
  contactPhone      String?  @map("contact_phone")
  ccwCustomerStatus String?  @map("ccw_customer_status") @db.VarChar(40)
  seatCount         Int      @map("seat_count")
  status            String   @default("confirmed") @db.VarChar(20) // confirmed | waitlisted
  calendarSynced    Boolean  @default(false) @map("calendar_synced")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  attendees CcwRoadshowAttendee[]

  @@index([eventSlug, status])
  @@index([eventSlug, createdAt(sort: Asc)])
  @@map("ccw_roadshow_registrations")
}

model CcwRoadshowAttendee {
  id              String   @id @default(uuid()) @db.Uuid
  registrationId  String   @map("registration_id") @db.Uuid
  fullName        String   @map("full_name")
  yearsExperience String   @map("years_experience") @db.VarChar(16) // band key
  goals           String   @db.Text
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  registration CcwRoadshowRegistration @relation(fields: [registrationId], references: [id], onDelete: Cascade)

  @@index([registrationId])
  @@map("ccw_roadshow_attendees")
}
```

Participant count for a city = `SUM(seatCount)` over registrations with
`status = 'confirmed'` and that `eventSlug`.

### 3. Booking API — `app/api/events/ccw-roadshow/checkout/route.ts`

Reworked handler:

1. Validate event + package, then validate the shared fields (company, contact
   email, contact phone, CCW status) and the per-attendee array (1 for single, up
   to 5 for team), each with Name, a valid experience band, and non-empty Goals.
   `seatCount` = number of attendees supplied.
2. Open a DB **transaction**:
   - Sum confirmed seats for the event.
   - If `confirmedSeats + seatCount <= capacity` → `status = 'confirmed'`,
     else `status = 'waitlisted'` (whole party).
   - Insert the `CcwRoadshowRegistration` and its `CcwRoadshowAttendee` rows.
3. Generate the free-entry token (existing `CCW-FREE-{CITY}-{CODE}` scheme).
4. If confirmed → call calendar sync to add the contact as a guest (see §6);
   set `calendarSynced` on success. Failure here is logged, not fatal.
5. Fire the existing CRM webhook (`roadshow.registration.created`), now including
   per-attendee experience/goals and the `status`.
6. Respond with `{ booking_url, free_entry_token, status, remaining }`.

The transaction guarantees two concurrent submissions cannot overbook.

### 4. Availability read

A server helper `getCcwRoadshowAvailability(eventSlug)` returning
`{ capacity, confirmed, remaining, isFull }`, used by the public event page/form
to display remaining seats and switch the CTA to waitlist mode.

### 5. Booking form — `src/components/marketing/CcwRoadshowBooking.tsx`

- **Shared section:** city, Company, contact Email, contact Phone, CCW customer status.
- **Per-attendee repeating block** (1 for single package, up to 5 for team):
  Name, Years Experience (dropdown of the shared bands), Goals (textarea). All required.
- Displays "X seats left". When the event is full, the form still submits but the
  primary button reads **"Join waitlist"** and a note explains waitlist behaviour.
- Submit posts the shared fields + the attendee array. On response, shows a
  confirmed or waitlisted message and redirects to the success page with `status`.

### 6. Calendar sync — `src/lib/server/ccw-roadshow-calendar.ts` (new)

- `addRegistrationToCalendar(registration, event)` — adds `contactEmail` as a
  guest on `event.calendarEventId` via the Google Calendar API, without removing
  existing guests, and without sending notifications to other guests.
- Used by the booking API on confirm, and by the admin promote action.
- **Setup dependency (flagged, not assumed wired):** `phill.mcgurk@gmail.com` is a
  consumer Gmail account, so a Google Workspace **service account with domain
  delegation will not work**. Production requires an **OAuth refresh token** for
  that account with the `calendar.events` scope, stored in env
  (e.g. `GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN`, client id/secret). The integration
  is written behind a small client module so that, until credentials are present,
  calls are a logged no-op (registration still succeeds; `calendarSynced` stays false).

### 7. Admin registry view — new protected route (e.g. `app/(admin)/.../ccw-roadshow/`)

- Per city: `confirmed / capacity` and waitlist count.
- Attendee table: name, company, contact email/phone, experience band, goals,
  CCW status, registration status, token, registered date.
- **CSV export** of the registry per city (or all).
- **Promote from waitlist** action: flips a `waitlisted` registration to
  `confirmed` if capacity allows (same transactional check), then runs calendar sync.
- Reuses CARSI's existing admin authentication guard (exact mechanism confirmed
  during planning).

### 8. Confirmation email — `src/lib/server/ccw-roadshow-booking-email.ts`

Flow unchanged. Optional, low priority: reflect waitlist status and list attendee
names / seat count in the email body.

## Data flow

```
Form (shared + attendees[])
  → POST /api/events/ccw-roadshow/checkout
      → TX: count confirmed seats → decide confirmed | waitlisted
           → insert Registration + Attendees
      → generate token
      → if confirmed: add contact as Google Calendar guest (set calendarSynced)
      → fire CRM webhook (roadshow.registration.created, + experience/goals/status)
      → return { booking_url, token, status, remaining }
  → success page shows confirmed / waitlisted
Admin view ← reads DB; CSV export; promote-from-waitlist → TX + calendar sync
```

## Testing

- **Unit (cap math):** exact fill to capacity; a team that overflows remaining
  seats is waitlisted as a whole party; `remaining` calculation; band validation.
- **Integration:** concurrent submissions never exceed capacity; a team writes N
  attendee rows under one registration; waitlist promotion respects capacity;
  calendar sync invoked only on confirm and is a no-op without credentials.
- **Form:** required per-attendee fields enforced; CTA switches to "Join waitlist"
  when full; confirmed vs waitlisted messaging.

## Out of scope (YAGNI)

- Automatic promotion on cancellation — promotion is manual via the admin view.
- Per-team-member individual email addresses (one shared contact per registration).
- Any payment handling — the event is free.

## Setup / follow-up tasks

- Provision Google Calendar OAuth credentials (refresh token + client id/secret)
  for `phill.mcgurk@gmail.com` with `calendar.events` scope, set as env vars.
- Run the Prisma migration in each environment.
