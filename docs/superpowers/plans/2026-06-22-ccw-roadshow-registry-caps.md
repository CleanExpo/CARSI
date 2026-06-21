# CCW Roadshow Registry, Caps, Waitlist & Calendar Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist CARSI x CCW roadshow registrations with per-city participant caps (Melbourne 10, Sydney 12), a per-attendee registry, waitlist overflow, the retained Unite-Group CRM webhook, an admin view with CSV export and waitlist promotion, and Google Calendar guest sync for confirmed registrants.

**Architecture:** A new pair of Prisma tables (`CcwRoadshowRegistration` 1→N `CcwRoadshowAttendee`) becomes the authoritative store. Pure decision helpers (cap math, CSV) are unit-tested with Vitest. A thin transactional registry service decides confirmed vs waitlisted atomically. The checkout API route is rewritten to persist, sync calendar, and still fire the CRM webhook. A protected admin page reads the registry and promotes waitlisted parties.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 + PostgreSQL (`@/lib/prisma`), custom JWT admin auth (`@/lib/admin/admin-session`), `googleapis` + `google-auth-library` (new), Vitest (new, unit tests), Playwright (existing, e2e).

## Global Constraints

- Caps counted as **people/seats**: Melbourne `10`, Sydney `12`. Copy verbatim into event config.
- Years Experience bands (verbatim): `0–1 years`, `2–5 years`, `6–10 years`, `11+ years`. Band keys: `0-1`, `2-5`, `6-10`, `11+`.
- Years Experience and Goals are **required** per attendee.
- Team registration keeps a **shared** Company + booking contact (email, phone); Name, Years Experience, Goals are **per attendee**. Max 5 attendees (`team-five` package); single package = 1 attendee.
- A registration is confirmed **only if the entire party fits** in remaining seats; otherwise the whole party is `waitlisted`. Never split a crew.
- The existing CRM webhook `roadshow.registration.created` is **retained** and still fires.
- Google Calendar event IDs (on `phill.mcgurk@gmail.com`): Melbourne `1d1uqjm6an36n1kgc6s4s3ln7s`, Sydney `h6qm8t3muuv44ht9gqann5dhuk`.
- Calendar sync must be a **logged no-op** when OAuth credentials are absent — registration still succeeds.
- Prisma client import: `import { prisma } from '@/lib/prisma';`. Admin guard: `import { getAdminSessionOrNull } from '@/lib/admin/admin-session';`. CRM: `import { emitCrmEvent } from '@/lib/server/crm-sync';` with signature `emitCrmEvent(eventType: CrmEventType, payload: Record<string, unknown>): Promise<void>`.

---

### Task 1: Vitest setup + event config (caps, calendar IDs, bands) + pure cap helpers

**Files:**
- Modify: `package.json` (add `vitest` devDep + `test:unit` script)
- Create: `vitest.config.ts`
- Modify: `src/lib/marketing/ccw-roadshow.ts`
- Test: `src/lib/marketing/ccw-roadshow.test.ts`

**Interfaces:**
- Produces:
  - `CcwRoadshowEvent` gains `capacity: number` and `calendarEventId: string`.
  - `export type RegistrationStatus = 'confirmed' | 'waitlisted';`
  - `export const ccwRoadshowExperienceBands: { value: string; label: string }[]`
  - `export function isValidExperienceBand(value: string): boolean`
  - `export function decideRegistrationStatus(input: { confirmedSeats: number; requestedSeats: number; capacity: number }): { status: RegistrationStatus }`
  - `export function computeAvailability(input: { capacity: number; confirmedSeats: number }): { capacity: number; confirmed: number; remaining: number; isFull: boolean }`

- [ ] **Step 1: Add Vitest dev dependency and script**

In `package.json`, add to `devDependencies`: `"vitest": "^3.2.4"`. Add to `scripts`: `"test:unit": "vitest run"`.

Run: `npm install`
Expected: installs vitest without errors.

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

Note: `@` resolves to `src` here because every aliased import in scope (`@/lib/...`) maps under `src/`.

- [ ] **Step 3: Write the failing test**

Create `src/lib/marketing/ccw-roadshow.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  computeAvailability,
  decideRegistrationStatus,
  isValidExperienceBand,
  ccwRoadshowEvents,
  getCcwRoadshowEvent,
} from './ccw-roadshow';

describe('event capacity config', () => {
  it('caps Melbourne at 10 and Sydney at 12', () => {
    expect(getCcwRoadshowEvent('melbourne')?.capacity).toBe(10);
    expect(getCcwRoadshowEvent('sydney')?.capacity).toBe(12);
  });

  it('maps every event to a calendar event id', () => {
    for (const event of ccwRoadshowEvents) {
      expect(event.calendarEventId.length).toBeGreaterThan(0);
    }
  });
});

describe('decideRegistrationStatus', () => {
  it('confirms when the whole party fits exactly', () => {
    expect(decideRegistrationStatus({ confirmedSeats: 5, requestedSeats: 5, capacity: 10 }).status).toBe('confirmed');
  });

  it('waitlists the whole party when it would overflow', () => {
    expect(decideRegistrationStatus({ confirmedSeats: 8, requestedSeats: 5, capacity: 10 }).status).toBe('waitlisted');
  });

  it('confirms a single seat into the last slot', () => {
    expect(decideRegistrationStatus({ confirmedSeats: 9, requestedSeats: 1, capacity: 10 }).status).toBe('confirmed');
  });

  it('waitlists when already full', () => {
    expect(decideRegistrationStatus({ confirmedSeats: 10, requestedSeats: 1, capacity: 10 }).status).toBe('waitlisted');
  });
});

describe('computeAvailability', () => {
  it('reports remaining and full state', () => {
    expect(computeAvailability({ capacity: 10, confirmedSeats: 7 })).toEqual({
      capacity: 10, confirmed: 7, remaining: 3, isFull: false,
    });
    expect(computeAvailability({ capacity: 10, confirmedSeats: 10 })).toEqual({
      capacity: 10, confirmed: 10, remaining: 0, isFull: true,
    });
  });

  it('never reports negative remaining', () => {
    expect(computeAvailability({ capacity: 10, confirmedSeats: 12 }).remaining).toBe(0);
  });
});

describe('isValidExperienceBand', () => {
  it('accepts known bands and rejects others', () => {
    expect(isValidExperienceBand('2-5')).toBe(true);
    expect(isValidExperienceBand('99')).toBe(false);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test:unit -- src/lib/marketing/ccw-roadshow.test.ts`
Expected: FAIL — `capacity`/`calendarEventId` undefined and helpers not exported.

- [ ] **Step 5: Implement the config + helpers**

In `src/lib/marketing/ccw-roadshow.ts`:

Add `capacity` and `calendarEventId` to the `CcwRoadshowEvent` type:

```ts
export type CcwRoadshowEvent = {
  slug: string;
  city: 'Melbourne' | 'Sydney';
  title: string;
  dates: string;
  dateRangeLabel: string;
  startDateIso: string;
  endDateIso: string;
  timeLabel: string;
  venueName: string;
  streetAddress: string;
  suburb: string;
  suburbStatePostcode: string;
  state: 'VIC' | 'NSW';
  description: string;
  capacity: number;
  calendarEventId: string;
};
```

In the Melbourne object add: `capacity: 10,` and `calendarEventId: '1d1uqjm6an36n1kgc6s4s3ln7s',`.
In the Sydney object add: `capacity: 12,` and `calendarEventId: 'h6qm8t3muuv44ht9gqann5dhuk',`.

Append at the end of the file:

```ts
export type RegistrationStatus = 'confirmed' | 'waitlisted';

export const ccwRoadshowExperienceBands: { value: string; label: string }[] = [
  { value: '0-1', label: '0–1 years' },
  { value: '2-5', label: '2–5 years' },
  { value: '6-10', label: '6–10 years' },
  { value: '11+', label: '11+ years' },
];

export function isValidExperienceBand(value: string): boolean {
  return ccwRoadshowExperienceBands.some((band) => band.value === value);
}

export function decideRegistrationStatus(input: {
  confirmedSeats: number;
  requestedSeats: number;
  capacity: number;
}): { status: RegistrationStatus } {
  const fits = input.confirmedSeats + input.requestedSeats <= input.capacity;
  return { status: fits ? 'confirmed' : 'waitlisted' };
}

export function computeAvailability(input: {
  capacity: number;
  confirmedSeats: number;
}): { capacity: number; confirmed: number; remaining: number; isFull: boolean } {
  const remaining = Math.max(0, input.capacity - input.confirmedSeats);
  return {
    capacity: input.capacity,
    confirmed: input.confirmedSeats,
    remaining,
    isFull: input.confirmedSeats >= input.capacity,
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:unit -- src/lib/marketing/ccw-roadshow.test.ts`
Expected: PASS (all cases).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/marketing/ccw-roadshow.ts src/lib/marketing/ccw-roadshow.test.ts
git commit -m "feat(roadshow): add caps, calendar ids, experience bands and cap helpers"
```

---

### Task 2: Prisma models + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_ccw_roadshow_registry/migration.sql` (generated)

**Interfaces:**
- Produces: Prisma models `CcwRoadshowRegistration` and `CcwRoadshowAttendee` (delegates `prisma.ccwRoadshowRegistration`, `prisma.ccwRoadshowAttendee`).

- [ ] **Step 1: Add the models to the schema**

Append to `prisma/schema.prisma`:

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
  status            String   @default("confirmed") @db.VarChar(20)
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
  yearsExperience String   @map("years_experience") @db.VarChar(16)
  goals           String   @db.Text
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  registration CcwRoadshowRegistration @relation(fields: [registrationId], references: [id], onDelete: Cascade)

  @@index([registrationId])
  @@map("ccw_roadshow_attendees")
}
```

- [ ] **Step 2: Create the migration**

Run: `npx prisma migrate dev --name ccw_roadshow_registry`
Expected: creates `prisma/migrations/<timestamp>_ccw_roadshow_registry/` and applies it to the dev DB. (Requires a reachable `DATABASE_URL`; if no dev DB is available, run `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma` is NOT a substitute — instead use `npx prisma migrate dev` against a local Postgres, e.g. the `.env.example` `postgresql://root:root@localhost:5432/carsi`.)

- [ ] **Step 3: Regenerate the client**

Run: `npx prisma generate`
Expected: client regenerated; `prisma.ccwRoadshowRegistration` and `prisma.ccwRoadshowAttendee` available with no type errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(roadshow): add registration + attendee tables"
```

---

### Task 3: Registry service (transactional create, availability, list, promote)

**Files:**
- Create: `src/lib/server/ccw-roadshow-registry.ts`

**Interfaces:**
- Consumes: `decideRegistrationStatus`, `computeAvailability` (Task 1); `prisma` (`@/lib/prisma`); `CcwRoadshowEvent`, `CcwRoadshowTicketPackage` types.
- Produces:
  - `type AttendeeInput = { fullName: string; yearsExperience: string; goals: string }`
  - `type CreateRegistrationInput = { event: CcwRoadshowEvent; companyName: string; contactEmail: string; contactPhone: string; ccwCustomerStatus: string; attendees: AttendeeInput[]; freeEntryToken: string }`
  - `type CreateRegistrationResult = { registrationId: string; status: RegistrationStatus; seatCount: number; remaining: number }`
  - `async function createRoadshowRegistration(input: CreateRegistrationInput): Promise<CreateRegistrationResult>`
  - `async function getRoadshowAvailability(eventSlug: string, capacity: number): Promise<{ capacity: number; confirmed: number; remaining: number; isFull: boolean }>`
  - `type RegistryRow = { registrationId: string; eventSlug: string; status: RegistrationStatus; freeEntryToken: string; companyName: string | null; contactEmail: string; contactPhone: string | null; ccwCustomerStatus: string | null; seatCount: number; createdAt: Date; attendees: { fullName: string; yearsExperience: string; goals: string }[] }`
  - `async function listRoadshowRegistry(eventSlug?: string): Promise<RegistryRow[]>`
  - `async function promoteRegistration(registrationId: string, event: CcwRoadshowEvent): Promise<{ status: RegistrationStatus; remaining: number }>`
  - `async function setRegistrationCalendarSynced(registrationId: string): Promise<void>`

- [ ] **Step 1: Implement the service**

Create `src/lib/server/ccw-roadshow-registry.ts`:

```ts
import { prisma } from '@/lib/prisma';
import {
  computeAvailability,
  decideRegistrationStatus,
  type CcwRoadshowEvent,
  type RegistrationStatus,
} from '@/lib/marketing/ccw-roadshow';

export type AttendeeInput = {
  fullName: string;
  yearsExperience: string;
  goals: string;
};

export type CreateRegistrationInput = {
  event: CcwRoadshowEvent;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  ccwCustomerStatus: string;
  attendees: AttendeeInput[];
  freeEntryToken: string;
};

export type CreateRegistrationResult = {
  registrationId: string;
  status: RegistrationStatus;
  seatCount: number;
  remaining: number;
};

export type RegistryRow = {
  registrationId: string;
  eventSlug: string;
  status: RegistrationStatus;
  freeEntryToken: string;
  companyName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  ccwCustomerStatus: string | null;
  seatCount: number;
  createdAt: Date;
  attendees: { fullName: string; yearsExperience: string; goals: string }[];
};

async function sumConfirmedSeats(tx: typeof prisma, eventSlug: string): Promise<number> {
  const aggregate = await tx.ccwRoadshowRegistration.aggregate({
    _sum: { seatCount: true },
    where: { eventSlug, status: 'confirmed' },
  });
  return aggregate._sum.seatCount ?? 0;
}

export async function createRoadshowRegistration(
  input: CreateRegistrationInput,
): Promise<CreateRegistrationResult> {
  const seatCount = input.attendees.length;
  const { event } = input;

  return prisma.$transaction(async (tx) => {
    const confirmedSeats = await sumConfirmedSeats(tx as typeof prisma, event.slug);
    const { status } = decideRegistrationStatus({
      confirmedSeats,
      requestedSeats: seatCount,
      capacity: event.capacity,
    });

    const registration = await tx.ccwRoadshowRegistration.create({
      data: {
        eventSlug: event.slug,
        freeEntryToken: input.freeEntryToken,
        companyName: input.companyName || null,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone || null,
        ccwCustomerStatus: input.ccwCustomerStatus || null,
        seatCount,
        status,
        attendees: {
          create: input.attendees.map((a) => ({
            fullName: a.fullName,
            yearsExperience: a.yearsExperience,
            goals: a.goals,
          })),
        },
      },
    });

    const confirmedAfter = status === 'confirmed' ? confirmedSeats + seatCount : confirmedSeats;
    const remaining = Math.max(0, event.capacity - confirmedAfter);

    return { registrationId: registration.id, status, seatCount, remaining };
  });
}

export async function getRoadshowAvailability(eventSlug: string, capacity: number) {
  const confirmedSeats = await sumConfirmedSeats(prisma, eventSlug);
  return computeAvailability({ capacity, confirmedSeats });
}

export async function listRoadshowRegistry(eventSlug?: string): Promise<RegistryRow[]> {
  const rows = await prisma.ccwRoadshowRegistration.findMany({
    where: eventSlug ? { eventSlug } : undefined,
    orderBy: { createdAt: 'asc' },
    include: { attendees: { orderBy: { createdAt: 'asc' } } },
  });

  return rows.map((row) => ({
    registrationId: row.id,
    eventSlug: row.eventSlug,
    status: row.status as RegistrationStatus,
    freeEntryToken: row.freeEntryToken,
    companyName: row.companyName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    ccwCustomerStatus: row.ccwCustomerStatus,
    seatCount: row.seatCount,
    createdAt: row.createdAt,
    attendees: row.attendees.map((a) => ({
      fullName: a.fullName,
      yearsExperience: a.yearsExperience,
      goals: a.goals,
    })),
  }));
}

export async function promoteRegistration(
  registrationId: string,
  event: CcwRoadshowEvent,
): Promise<{ status: RegistrationStatus; remaining: number }> {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.ccwRoadshowRegistration.findUniqueOrThrow({
      where: { id: registrationId },
    });

    if (registration.status === 'confirmed') {
      const confirmedSeats = await sumConfirmedSeats(tx as typeof prisma, event.slug);
      return { status: 'confirmed', remaining: Math.max(0, event.capacity - confirmedSeats) };
    }

    const confirmedSeats = await sumConfirmedSeats(tx as typeof prisma, event.slug);
    const { status } = decideRegistrationStatus({
      confirmedSeats,
      requestedSeats: registration.seatCount,
      capacity: event.capacity,
    });

    if (status === 'waitlisted') {
      throw new Error('NOT_ENOUGH_CAPACITY');
    }

    await tx.ccwRoadshowRegistration.update({
      where: { id: registrationId },
      data: { status: 'confirmed' },
    });

    const remaining = Math.max(0, event.capacity - (confirmedSeats + registration.seatCount));
    return { status: 'confirmed', remaining };
  });
}

export async function setRegistrationCalendarSynced(registrationId: string): Promise<void> {
  await prisma.ccwRoadshowRegistration.update({
    where: { id: registrationId },
    data: { calendarSynced: true },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `ccw-roadshow-registry.ts`. (The decision logic itself is already unit-tested in Task 1; this service is a thin DB wrapper around it.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/ccw-roadshow-registry.ts
git commit -m "feat(roadshow): transactional registry service with cap + waitlist"
```

---

### Task 4: Google Calendar sync module

**Files:**
- Modify: `package.json` (add `googleapis`, `google-auth-library`)
- Create: `src/lib/server/ccw-roadshow-calendar.ts`
- Modify: `.env.example` (document new vars)

**Interfaces:**
- Produces: `async function addRegistrationToCalendar(params: { calendarEventId: string; attendeeEmail: string }): Promise<boolean>` — returns `true` if a guest was added, `false` if credentials are absent (no-op) or on handled failure.

- [ ] **Step 1: Add dependencies**

In `package.json` `dependencies` add `"googleapis": "^144.0.0"` and `"google-auth-library": "^9.15.0"`.

Run: `npm install`
Expected: installs without errors.

- [ ] **Step 2: Implement the calendar module**

Create `src/lib/server/ccw-roadshow-calendar.ts`:

```ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'phill.mcgurk@gmail.com';

function getOAuthClient(): OAuth2Client | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function addRegistrationToCalendar(params: {
  calendarEventId: string;
  attendeeEmail: string;
}): Promise<boolean> {
  const auth = getOAuthClient();
  if (!auth) {
    console.warn('[ccw-roadshow-calendar] Google Calendar credentials absent — skipping sync.');
    return false;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });

    const existing = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId: params.calendarEventId,
    });

    const attendees = existing.data.attendees ?? [];
    const already = attendees.some(
      (a) => a.email?.toLowerCase() === params.attendeeEmail.toLowerCase(),
    );
    if (already) {
      return true;
    }

    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: params.calendarEventId,
      sendUpdates: 'externalOnly',
      requestBody: {
        attendees: [...attendees, { email: params.attendeeEmail }],
      },
    });

    return true;
  } catch (error) {
    console.error('[ccw-roadshow-calendar] failed to add guest:', error);
    return false;
  }
}
```

- [ ] **Step 3: Document env vars**

Append to `.env.example`:

```
# CCW roadshow Google Calendar sync (consumer Gmail → OAuth refresh token, NOT a service account)
GOOGLE_CALENDAR_ID=phill.mcgurk@gmail.com
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN=
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/server/ccw-roadshow-calendar.ts .env.example
git commit -m "feat(roadshow): google calendar guest sync (no-op without creds)"
```

---

### Task 5: Rewrite checkout API route + add availability endpoint

**Files:**
- Modify (rewrite): `app/api/events/ccw-roadshow/checkout/route.ts`
- Create: `app/api/events/ccw-roadshow/availability/route.ts`

**Interfaces:**
- Consumes: `createRoadshowRegistration`, `setRegistrationCalendarSynced`, `getRoadshowAvailability` (Task 3); `addRegistrationToCalendar` (Task 4); `emitCrmEvent`; config helpers + `isValidExperienceBand`.
- Produces:
  - POST `/api/events/ccw-roadshow/checkout` returns `{ booking_url: string; free_entry_token: string; status: RegistrationStatus; remaining: number }`.
  - Request body shape: `{ eventSlug, packageId, ccwCustomerStatus, companyName, contactEmail, contactPhone, attendees: { fullName, yearsExperience, goals }[] }`.
  - GET `/api/events/ccw-roadshow/availability?event=<slug>` returns `{ capacity, confirmed, remaining, isFull }` (or `{ events: Record<slug, …> }` when no `event` param).

- [ ] **Step 1: Rewrite the checkout route**

Replace the contents of `app/api/events/ccw-roadshow/checkout/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

import {
  ccwRoadshowFreeEntryOffer,
  ccwRoadshowPath,
  getCcwRoadshowEvent,
  getCcwRoadshowTicketPackage,
  isValidExperienceBand,
} from '@/lib/marketing/ccw-roadshow';
import { emitCrmEvent } from '@/lib/server/crm-sync';
import {
  createRoadshowRegistration,
  setRegistrationCalendarSynced,
  type AttendeeInput,
} from '@/lib/server/ccw-roadshow-registry';
import { addRegistrationToCalendar } from '@/lib/server/ccw-roadshow-calendar';

type AttendeeBody = { fullName?: string; yearsExperience?: string; goals?: string };
type RoadshowCheckoutBody = {
  eventSlug?: string;
  packageId?: string;
  ccwCustomerStatus?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  attendees?: AttendeeBody[];
};

function clean(value: unknown, maxLength = 240) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getEventTokenCode(eventSlug: string) {
  return eventSlug.trim().slice(0, 3).toUpperCase();
}

function generateFreeEntryToken(eventSlug: string) {
  const eventCode = getEventTokenCode(eventSlug);
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `${ccwRoadshowFreeEntryOffer.tokenPrefix}-${eventCode}-${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as RoadshowCheckoutBody;
    const event = getCcwRoadshowEvent(body.eventSlug);
    const ticketPackage = getCcwRoadshowTicketPackage(body.packageId);

    if (!event) {
      return NextResponse.json({ detail: 'Select a valid roadshow event.' }, { status: 400 });
    }
    if (!ticketPackage) {
      return NextResponse.json({ detail: 'Select a valid ticket package.' }, { status: 400 });
    }

    const companyName = clean(body.companyName, 160);
    const contactEmail = clean(body.contactEmail, 160).toLowerCase();
    const contactPhone = clean(body.contactPhone, 80);
    const ccwCustomerStatus = clean(body.ccwCustomerStatus, 40) || 'not_sure';

    if (!contactEmail || !isValidEmail(contactEmail)) {
      return NextResponse.json({ detail: 'A valid contact email is required.' }, { status: 400 });
    }

    const rawAttendees = Array.isArray(body.attendees) ? body.attendees : [];
    if (rawAttendees.length < 1 || rawAttendees.length > ticketPackage.attendeeCount) {
      return NextResponse.json(
        { detail: `Provide between 1 and ${ticketPackage.attendeeCount} attendees.` },
        { status: 400 },
      );
    }

    const attendees: AttendeeInput[] = [];
    for (const raw of rawAttendees) {
      const fullName = clean(raw.fullName, 120);
      const yearsExperience = clean(raw.yearsExperience, 16);
      const goals = clean(raw.goals, 600);
      if (!fullName) {
        return NextResponse.json({ detail: 'Each attendee needs a name.' }, { status: 400 });
      }
      if (!isValidExperienceBand(yearsExperience)) {
        return NextResponse.json({ detail: 'Select years of experience for each attendee.' }, { status: 400 });
      }
      if (!goals) {
        return NextResponse.json({ detail: 'Each attendee must share what they want to achieve.' }, { status: 400 });
      }
      attendees.push({ fullName, yearsExperience, goals });
    }

    const freeEntryToken = generateFreeEntryToken(event.slug);

    const result = await createRoadshowRegistration({
      event,
      companyName,
      contactEmail,
      contactPhone,
      ccwCustomerStatus,
      attendees,
      freeEntryToken,
    });

    if (result.status === 'confirmed') {
      const synced = await addRegistrationToCalendar({
        calendarEventId: event.calendarEventId,
        attendeeEmail: contactEmail,
      });
      if (synced) {
        await setRegistrationCalendarSynced(result.registrationId);
      }
    }

    const origin = request.nextUrl.origin;
    const successParams = new URLSearchParams({
      token: freeEntryToken,
      event: event.slug,
      city: event.city,
      dates: event.dates,
      seats: String(result.seatCount),
      status: result.status,
    });
    const bookingUrl = `${origin}${ccwRoadshowPath}/success?${successParams.toString()}`;

    await emitCrmEvent('roadshow.registration.created', {
      source: 'carsi-ccw-roadshow',
      free_entry_token: freeEntryToken,
      event_slug: event.slug,
      event_city: event.city,
      event_dates: event.dates,
      ticket_package: ticketPackage.id,
      attendee_count: result.seatCount,
      registration_status: result.status,
      company_name: companyName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      ccw_customer_status: ccwCustomerStatus,
      attendees: attendees.map((a) => ({
        name: a.fullName,
        years_experience: a.yearsExperience,
        goals: a.goals,
      })),
      amount_cents: 0,
      currency: 'AUD',
      registration_url: bookingUrl,
    });

    return NextResponse.json({
      booking_url: bookingUrl,
      free_entry_token: freeEntryToken,
      status: result.status,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error('[ccw-roadshow-registration] error:', error);
    return NextResponse.json({ detail: 'Failed to reserve free event entry.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add the availability endpoint**

Create `app/api/events/ccw-roadshow/availability/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

import { ccwRoadshowEvents, getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import { getRoadshowAvailability } from '@/lib/server/ccw-roadshow-registry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('event');

  if (slug) {
    const event = getCcwRoadshowEvent(slug);
    if (!event) {
      return NextResponse.json({ detail: 'Unknown event.' }, { status: 404 });
    }
    const availability = await getRoadshowAvailability(event.slug, event.capacity);
    return NextResponse.json(availability);
  }

  const entries = await Promise.all(
    ccwRoadshowEvents.map(async (event) => [
      event.slug,
      await getRoadshowAvailability(event.slug, event.capacity),
    ] as const),
  );
  return NextResponse.json({ events: Object.fromEntries(entries) });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/events/ccw-roadshow/checkout/route.ts app/api/events/ccw-roadshow/availability/route.ts
git commit -m "feat(roadshow): persist registrations, enforce caps, sync calendar, expose availability"
```

---

### Task 6: Booking form — multi-attendee, waitlist labelling, live availability

**Files:**
- Modify (rewrite): `src/components/marketing/CcwRoadshowBooking.tsx`

**Interfaces:**
- Consumes: GET `/api/events/ccw-roadshow/availability`; POST `/api/events/ccw-roadshow/checkout` (new body shape from Task 5); `ccwRoadshowExperienceBands`, `ccwRoadshowTicketPackages`, `CcwRoadshowEvent`.

- [ ] **Step 1: Rewrite the form component**

Replace the contents of `src/components/marketing/CcwRoadshowBooking.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, Plus, X } from 'lucide-react';

import type { CcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  ccwRoadshowExperienceBands,
  ccwRoadshowFreeEntryOffer,
  ccwRoadshowTicketPackages,
  type CcwRoadshowTicketPackage,
} from '@/lib/marketing/ccw-roadshow';
import {
  marketingBodySm,
  marketingBtnPrimary,
  marketingEyebrowPill,
  marketingInput,
  marketingPanel,
  marketingStatCard,
} from '@/lib/marketing/marketing-ui';

type AttendeeForm = { fullName: string; yearsExperience: string; goals: string };
type Availability = { capacity: number; confirmed: number; remaining: number; isFull: boolean };

type BookingFormState = {
  eventSlug: string;
  packageId: CcwRoadshowTicketPackage['id'];
  ccwCustomerStatus: 'current' | 'past' | 'not_sure';
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  attendees: AttendeeForm[];
};

const labelClass = 'mb-1.5 block text-xs font-medium tracking-wide text-white/45 uppercase';

function emptyAttendee(): AttendeeForm {
  return { fullName: '', yearsExperience: '', goals: '' };
}

export function CcwRoadshowBooking({ events }: { events: CcwRoadshowEvent[] }) {
  const [form, setForm] = useState<BookingFormState>({
    eventSlug: events[0]?.slug ?? '',
    packageId: 'single',
    ccwCustomerStatus: 'current',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    attendees: [emptyAttendee()],
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.slug === form.eventSlug) ?? events[0],
    [events, form.eventSlug],
  );
  const selectedPackage =
    ccwRoadshowTicketPackages.find((pkg) => pkg.id === form.packageId) ??
    ccwRoadshowTicketPackages[0];

  useEffect(() => {
    let active = true;
    if (!form.eventSlug) return;
    fetch(`/api/events/ccw-roadshow/availability?event=${form.eventSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setAvailability(data as Availability);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [form.eventSlug]);

  if (!selectedEvent || !selectedPackage) {
    return null;
  }

  const maxSeats = selectedPackage.attendeeCount;
  const isFull = availability?.isFull ?? false;

  function updateField<K extends keyof BookingFormState>(key: K, value: BookingFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectPackage(pkg: CcwRoadshowTicketPackage) {
    setForm((current) => {
      const attendees = current.attendees.slice(0, pkg.attendeeCount);
      return { ...current, packageId: pkg.id, attendees: attendees.length ? attendees : [emptyAttendee()] };
    });
  }

  function updateAttendee(index: number, key: keyof AttendeeForm, value: string) {
    setForm((current) => {
      const attendees = current.attendees.map((a, i) => (i === index ? { ...a, [key]: value } : a));
      return { ...current, attendees };
    });
  }

  function addAttendee() {
    setForm((current) =>
      current.attendees.length >= maxSeats
        ? current
        : { ...current, attendees: [...current.attendees, emptyAttendee()] },
    );
  }

  function removeAttendee(index: number) {
    setForm((current) =>
      current.attendees.length <= 1
        ? current
        : { ...current, attendees: current.attendees.filter((_, i) => i !== index) },
    );
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function submitBooking() {
    setStatus('loading');
    setMessage('');

    const contactEmail = form.contactEmail.trim();
    if (!contactEmail || !isValidEmail(contactEmail)) {
      setStatus('error');
      setMessage('A valid contact email is required.');
      return;
    }
    for (const attendee of form.attendees) {
      if (!attendee.fullName.trim()) {
        setStatus('error');
        setMessage('Every attendee needs a name.');
        return;
      }
      if (!attendee.yearsExperience) {
        setStatus('error');
        setMessage('Select years of experience for every attendee.');
        return;
      }
      if (!attendee.goals.trim()) {
        setStatus('error');
        setMessage('Tell us what each attendee wants to achieve.');
        return;
      }
    }

    try {
      const response = await fetch('/api/events/ccw-roadshow/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: form.eventSlug,
          packageId: form.packageId,
          ccwCustomerStatus: form.ccwCustomerStatus,
          companyName: form.companyName.trim(),
          contactEmail,
          contactPhone: form.contactPhone.trim(),
          attendees: form.attendees.map((a) => ({
            fullName: a.fullName.trim(),
            yearsExperience: a.yearsExperience,
            goals: a.goals.trim(),
          })),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        booking_url?: string;
        detail?: string;
        error?: string;
      };
      if (!response.ok || !payload.booking_url) {
        throw new Error(payload.detail || payload.error || 'Could not reserve your free entry.');
      }
      window.location.href = payload.booking_url;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Could not reserve your free entry.');
    }
  }

  return (
    <div className={`p-5 sm:p-6 ${marketingStatCard}`}>
      <div className="mb-5">
        <p className={marketingEyebrowPill}>{isFull ? 'Waitlist open' : 'Limited places'}</p>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
          {isFull ? 'Join the waitlist' : 'Claim your free entry token'}
        </h2>
        <p className={`mt-2 ${marketingBodySm}`}>
          {selectedEvent.city} - {selectedEvent.dates}. {ccwRoadshowFreeEntryOffer.detail}
        </p>
        {availability && (
          <p className={`mt-2 ${marketingBodySm}`}>
            {availability.remaining > 0
              ? `${availability.remaining} of ${availability.capacity} seats left.`
              : 'This city is full — new registrations join the waitlist.'}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className={labelClass}>Event</span>
          <select
            value={form.eventSlug}
            onChange={(event) => updateField('eventSlug', event.target.value)}
            className={marketingInput}
          >
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.city} - {event.dates}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className={labelClass}>Registration type</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {ccwRoadshowTicketPackages.map((pkg) => {
              const active = form.packageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => selectPackage(pkg)}
                  className={`min-h-[5.5rem] rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-[#2490ed]/50 bg-[#2490ed]/12 shadow-[0_8px_24px_-12px_rgba(36,144,237,0.35)]'
                      : `${marketingPanel} hover:border-white/20`
                  }`}
                >
                  <span className="block text-sm font-semibold text-white/90">{pkg.label}</span>
                  <span className="mt-1 block text-lg font-bold text-white">Free</span>
                  <span className={`mt-1 block ${marketingBodySm}`}>
                    Up to {pkg.attendeeCount} {pkg.attendeeCount === 1 ? 'person' : 'people'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className={labelClass}>CCW customer status</span>
          <select
            value={form.ccwCustomerStatus}
            onChange={(event) =>
              updateField('ccwCustomerStatus', event.target.value as BookingFormState['ccwCustomerStatus'])
            }
            className={marketingInput}
          >
            <option value="current">Current CCW customer</option>
            <option value="past">Past CCW customer</option>
            <option value="not_sure">Not sure / CCW team can confirm</option>
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Business</span>
            <input
              value={form.companyName}
              onChange={(event) => updateField('companyName', event.target.value)}
              autoComplete="organization"
              className={marketingInput}
              placeholder="Business name"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Contact email</span>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) => updateField('contactEmail', event.target.value)}
              autoComplete="email"
              inputMode="email"
              required
              className={marketingInput}
              placeholder="name@example.com"
            />
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Contact phone</span>
          <input
            type="tel"
            value={form.contactPhone}
            onChange={(event) => updateField('contactPhone', event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            className={marketingInput}
            placeholder="Mobile number"
          />
        </label>

        <div className="space-y-3">
          <span className={labelClass}>Attendees</span>
          {form.attendees.map((attendee, index) => (
            <div key={index} className={`rounded-xl border p-3 ${marketingPanel}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-white/80">Attendee {index + 1}</span>
                {form.attendees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttendee(index)}
                    className="text-white/50 hover:text-white"
                    aria-label={`Remove attendee ${index + 1}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={attendee.fullName}
                  onChange={(e) => updateAttendee(index, 'fullName', e.target.value)}
                  className={marketingInput}
                  placeholder="Full name"
                  required
                />
                <select
                  value={attendee.yearsExperience}
                  onChange={(e) => updateAttendee(index, 'yearsExperience', e.target.value)}
                  className={marketingInput}
                  required
                >
                  <option value="">Years experience…</option>
                  {ccwRoadshowExperienceBands.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={attendee.goals}
                onChange={(e) => updateAttendee(index, 'goals', e.target.value)}
                className={`mt-3 min-h-[4.5rem] ${marketingInput}`}
                placeholder="What do they want to achieve from the 2 days?"
                required
              />
            </div>
          ))}

          {form.attendees.length < maxSeats && (
            <button
              type="button"
              onClick={addAttendee}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-2 text-sm text-white/70 hover:border-white/40 hover:text-white`}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add attendee ({form.attendees.length}/{maxSeats})
            </button>
          )}
        </div>

        {message && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={submitBooking}
          disabled={status === 'loading'}
          className={`h-12 w-full disabled:cursor-wait disabled:opacity-60 ${marketingBtnPrimary}`}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          {isFull ? 'Join waitlist' : 'Claim free entry token'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + build the route**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/marketing/CcwRoadshowBooking.tsx
git commit -m "feat(roadshow): multi-attendee registration form with waitlist + live availability"
```

---

### Task 7: CSV serialization helper (TDD)

**Files:**
- Create: `src/lib/server/ccw-roadshow-csv.ts`
- Test: `src/lib/server/ccw-roadshow-csv.test.ts`

**Interfaces:**
- Consumes: `RegistryRow` (Task 3).
- Produces: `export function registryToCsv(rows: RegistryRow[]): string` — one CSV line per attendee, columns: `event,status,company,contact_email,contact_phone,ccw_status,attendee_name,years_experience,goals,token,registered_at`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/ccw-roadshow-csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { registryToCsv } from './ccw-roadshow-csv';
import type { RegistryRow } from './ccw-roadshow-registry';

const row: RegistryRow = {
  registrationId: 'r1',
  eventSlug: 'melbourne',
  status: 'confirmed',
  freeEntryToken: 'CCW-FREE-MEL-ABCD1234',
  companyName: 'Acme, Pty',
  contactEmail: 'boss@acme.test',
  contactPhone: '0400000000',
  ccwCustomerStatus: 'current',
  seatCount: 2,
  createdAt: new Date('2026-06-22T00:00:00.000Z'),
  attendees: [
    { fullName: 'Jane Smith', yearsExperience: '2-5', goals: 'Quote with confidence' },
    { fullName: 'John Doe', yearsExperience: '0-1', goals: 'Learn tile cleaning' },
  ],
};

describe('registryToCsv', () => {
  it('writes a header plus one row per attendee', () => {
    const csv = registryToCsv([row]);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 attendees
    expect(lines[0]).toContain('attendee_name');
    expect(lines[1]).toContain('Jane Smith');
    expect(lines[2]).toContain('John Doe');
  });

  it('quotes and escapes fields containing commas or quotes', () => {
    const csv = registryToCsv([row]);
    expect(csv).toContain('"Acme, Pty"');
  });

  it('returns only a header for no rows', () => {
    expect(registryToCsv([]).trim().split('\n')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/lib/server/ccw-roadshow-csv.test.ts`
Expected: FAIL — `registryToCsv` not defined.

- [ ] **Step 3: Implement the helper**

Create `src/lib/server/ccw-roadshow-csv.ts`:

```ts
import type { RegistryRow } from './ccw-roadshow-registry';

const HEADER = [
  'event',
  'status',
  'company',
  'contact_email',
  'contact_phone',
  'ccw_status',
  'attendee_name',
  'years_experience',
  'goals',
  'token',
  'registered_at',
];

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function registryToCsv(rows: RegistryRow[]): string {
  const lines = [HEADER.join(',')];

  for (const row of rows) {
    for (const attendee of row.attendees) {
      const cells = [
        row.eventSlug,
        row.status,
        row.companyName ?? '',
        row.contactEmail,
        row.contactPhone ?? '',
        row.ccwCustomerStatus ?? '',
        attendee.fullName,
        attendee.yearsExperience,
        attendee.goals,
        row.freeEntryToken,
        row.createdAt.toISOString(),
      ];
      lines.push(cells.map((c) => escapeCell(String(c))).join(','));
    }
  }

  return lines.join('\n') + '\n';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/lib/server/ccw-roadshow-csv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/ccw-roadshow-csv.ts src/lib/server/ccw-roadshow-csv.test.ts
git commit -m "feat(roadshow): registry CSV serialization"
```

---

### Task 8: Admin API — list + CSV + promote

**Files:**
- Create: `app/api/admin/ccw-roadshow/route.ts`
- Create: `app/api/admin/ccw-roadshow/promote/route.ts`

**Interfaces:**
- Consumes: `getAdminSessionOrNull`; `listRoadshowRegistry`, `getRoadshowAvailability`, `promoteRegistration`, `setRegistrationCalendarSynced` (Task 3); `registryToCsv` (Task 7); `addRegistrationToCalendar` (Task 4); `ccwRoadshowEvents`, `getCcwRoadshowEvent`.
- Produces:
  - GET `/api/admin/ccw-roadshow` → JSON `{ cities: { slug, city, capacity, confirmed, remaining, waitlisted }[], rows: RegistryRow[] }`; with `?format=csv` → `text/csv` download.
  - POST `/api/admin/ccw-roadshow/promote` body `{ registrationId, eventSlug }` → `{ status, remaining }`.

- [ ] **Step 1: Implement the list + CSV route**

Create `app/api/admin/ccw-roadshow/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { ccwRoadshowEvents } from '@/lib/marketing/ccw-roadshow';
import {
  getRoadshowAvailability,
  listRoadshowRegistry,
} from '@/lib/server/ccw-roadshow-registry';
import { registryToCsv } from '@/lib/server/ccw-roadshow-csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const rows = await listRoadshowRegistry();

  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const csv = registryToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ccw-roadshow-registry.csv"',
      },
    });
  }

  const cities = await Promise.all(
    ccwRoadshowEvents.map(async (event) => {
      const availability = await getRoadshowAvailability(event.slug, event.capacity);
      const waitlisted = rows
        .filter((r) => r.eventSlug === event.slug && r.status === 'waitlisted')
        .reduce((sum, r) => sum + r.seatCount, 0);
      return {
        slug: event.slug,
        city: event.city,
        capacity: event.capacity,
        confirmed: availability.confirmed,
        remaining: availability.remaining,
        waitlisted,
      };
    }),
  );

  return NextResponse.json({ cities, rows });
}
```

- [ ] **Step 2: Implement the promote route**

Create `app/api/admin/ccw-roadshow/promote/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  promoteRegistration,
  setRegistrationCalendarSynced,
} from '@/lib/server/ccw-roadshow-registry';
import { addRegistrationToCalendar } from '@/lib/server/ccw-roadshow-calendar';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    registrationId?: string;
    eventSlug?: string;
  };
  const event = getCcwRoadshowEvent(body.eventSlug);
  if (!body.registrationId || !event) {
    return NextResponse.json({ detail: 'registrationId and a valid eventSlug are required.' }, { status: 400 });
  }

  try {
    const result = await promoteRegistration(body.registrationId, event);

    const registration = await prisma.ccwRoadshowRegistration.findUnique({
      where: { id: body.registrationId },
    });
    if (registration) {
      const synced = await addRegistrationToCalendar({
        calendarEventId: event.calendarEventId,
        attendeeEmail: registration.contactEmail,
      });
      if (synced) {
        await setRegistrationCalendarSynced(body.registrationId);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_ENOUGH_CAPACITY') {
      return NextResponse.json({ detail: 'Not enough capacity to promote this party.' }, { status: 409 });
    }
    console.error('[ccw-roadshow-promote] error:', error);
    return NextResponse.json({ detail: 'Failed to promote registration.' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/ccw-roadshow/route.ts app/api/admin/ccw-roadshow/promote/route.ts
git commit -m "feat(roadshow): admin registry API with CSV export and waitlist promotion"
```

---

### Task 9: Admin registry page + client component

**Files:**
- Create: `app/(admin)/admin/ccw-roadshow/page.tsx`
- Create: `src/components/admin/AdminCcwRoadshowClient.tsx`

**Interfaces:**
- Consumes: GET `/api/admin/ccw-roadshow`, POST `/api/admin/ccw-roadshow/promote` (Task 8).

- [ ] **Step 1: Create the page (thin server component, matches existing admin pattern)**

Create `app/(admin)/admin/ccw-roadshow/page.tsx`:

```tsx
import { AdminCcwRoadshowClient } from '@/components/admin/AdminCcwRoadshowClient';

export const dynamic = 'force-dynamic';

export default function AdminCcwRoadshowPage() {
  return <AdminCcwRoadshowClient />;
}
```

- [ ] **Step 2: Create the client component**

Create `src/components/admin/AdminCcwRoadshowClient.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';

type CitySummary = {
  slug: string;
  city: string;
  capacity: number;
  confirmed: number;
  remaining: number;
  waitlisted: number;
};

type RegistryRow = {
  registrationId: string;
  eventSlug: string;
  status: 'confirmed' | 'waitlisted';
  freeEntryToken: string;
  companyName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  ccwCustomerStatus: string | null;
  seatCount: number;
  createdAt: string;
  attendees: { fullName: string; yearsExperience: string; goals: string }[];
};

export function AdminCcwRoadshowClient() {
  const [cities, setCities] = useState<CitySummary[]>([]);
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ccw-roadshow');
      if (!res.ok) throw new Error('Failed to load registry');
      const data = (await res.json()) as { cities: CitySummary[]; rows: RegistryRow[] };
      setCities(data.cities);
      setRows(data.rows);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function promote(row: RegistryRow) {
    const res = await fetch('/api/admin/ccw-roadshow/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: row.registrationId, eventSlug: row.eventSlug }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { detail?: string };
      setError(payload.detail || 'Failed to promote');
      return;
    }
    await load();
  }

  if (loading) return <div className="p-6">Loading registry…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CCW Roadshow Registry</h1>
        <a
          href="/api/admin/ccw-roadshow?format=csv"
          className="rounded-lg border px-3 py-2 text-sm font-medium"
        >
          Export CSV
        </a>
      </div>

      {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {cities.map((c) => (
          <div key={c.slug} className="rounded-xl border p-4">
            <h2 className="text-lg font-semibold">{c.city}</h2>
            <p className="text-sm text-gray-600">
              {c.confirmed} / {c.capacity} confirmed · {c.remaining} left · {c.waitlisted} waitlisted
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Event</th>
              <th className="p-2">Status</th>
              <th className="p-2">Company</th>
              <th className="p-2">Contact</th>
              <th className="p-2">Attendees</th>
              <th className="p-2">Token</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.registrationId} className="border-b align-top">
                <td className="p-2">{row.eventSlug}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{row.companyName ?? '—'}</td>
                <td className="p-2">
                  {row.contactEmail}
                  <br />
                  {row.contactPhone ?? '—'}
                </td>
                <td className="p-2">
                  <ul className="space-y-1">
                    {row.attendees.map((a, i) => (
                      <li key={i}>
                        <span className="font-medium">{a.fullName}</span> · {a.yearsExperience}
                        <br />
                        <span className="text-gray-600">{a.goals}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="p-2 font-mono text-xs">{row.freeEntryToken}</td>
                <td className="p-2">
                  {row.status === 'waitlisted' && (
                    <button
                      type="button"
                      onClick={() => promote(row)}
                      className="rounded-lg border px-2 py-1 text-xs font-medium"
                    >
                      Promote
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/admin/ccw-roadshow/page.tsx src/components/admin/AdminCcwRoadshowClient.tsx
git commit -m "feat(roadshow): admin registry page with per-city counts and promote"
```

---

### Task 10: End-to-end verification + build + setup notes

**Files:**
- Create: `e2e/ccw-roadshow-registration.spec.ts`
- Modify: `docs/superpowers/specs/2026-06-22-ccw-roadshow-registry-caps-design.md` (append a "Setup status" note — optional)

**Interfaces:**
- Consumes: the running app (dev server) + a reachable test `DATABASE_URL`.

- [ ] **Step 1: Write a happy-path e2e test**

Create `e2e/ccw-roadshow-registration.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('CCW roadshow registration', () => {
  test('a single attendee can register and is confirmed', async ({ page }) => {
    await page.goto('/events/ccw-roadshow');

    await page.getByPlaceholder('Business name').fill('Playwright Cleaning Co');
    await page.getByPlaceholder('name@example.com').fill(`pw-${Date.now()}@example.test`);
    await page.getByPlaceholder('Full name').first().fill('Pat Tester');
    await page.getByRole('combobox').nth(2).selectOption('2-5'); // attendee experience select
    await page
      .getByPlaceholder('What do they want to achieve from the 2 days?')
      .first()
      .fill('Quote with confidence');

    await page.getByRole('button', { name: /Claim free entry token|Join waitlist/ }).click();

    await expect(page).toHaveURL(/\/events\/ccw-roadshow\/success/);
    await expect(page).toHaveURL(/status=(confirmed|waitlisted)/);
  });
});
```

Note: the experience `<select>` is the 3rd combobox on the page (event, CCW status, then the attendee's experience). If the page markup differs, target it by its surrounding "Attendee 1" container instead.

- [ ] **Step 2: Run unit tests (full suite)**

Run: `npm run test:unit`
Expected: PASS — all cap-math, band, and CSV tests green.

- [ ] **Step 3: Run the e2e (requires DATABASE_URL + dev server per playwright.config)**

Run: `npm run test:e2e -- ccw-roadshow-registration`
Expected: PASS — registration redirects to the success page with a `status` param. If no test DB is configured in the environment, document this as a manual verification step instead and run it once a DB is available.

- [ ] **Step 4: Production build sanity**

Run: `npm run build`
Expected: build completes with no type or route errors.

- [ ] **Step 5: Commit**

```bash
git add e2e/ccw-roadshow-registration.spec.ts
git commit -m "test(roadshow): e2e registration happy path"
```

---

## Setup / follow-up (post-implementation, flagged in spec)

- Provision Google Calendar OAuth credentials for `phill.mcgurk@gmail.com` (consumer Gmail → OAuth refresh token with `calendar.events` scope; a service account will not work). Set `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN`, and (optionally) `GOOGLE_CALENDAR_ID` in each environment. Until set, calendar sync is a logged no-op and `calendarSynced` stays `false`.
- Run `prisma migrate deploy` in every environment (already part of `start` / `dev:with-migrate` scripts).

## Self-Review Notes

- **Spec coverage:** caps (Task 1+3), registry tables (Task 2), per-attendee fields incl. required bands/goals (Tasks 1,5,6), waitlist whole-party (Tasks 1,3), retained CRM webhook (Task 5), calendar guest sync + setup flag (Tasks 4,5,8,10), admin view + CSV + promote (Tasks 7,8,9), testing (Tasks 1,7,10). All spec sections map to a task.
- **Type consistency:** `RegistrationStatus`, `RegistryRow`, `AttendeeInput`, `createRoadshowRegistration`, `getRoadshowAvailability`, `promoteRegistration`, `setRegistrationCalendarSynced`, `addRegistrationToCalendar`, `registryToCsv` are defined once and consumed with identical signatures across tasks.
- **No placeholders:** every code step contains full code; commands have expected output.
