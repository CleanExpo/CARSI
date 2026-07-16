import { prisma } from '@/lib/prisma';
import {
  computeAvailability,
  decideRegistrationStatus,
  type CcwRoadshowEvent,
  type RegistrationStatus,
} from '@/lib/marketing/ccw-roadshow';
import { runSerializable } from '@/lib/server/db-tx';
import { getEmailStatusByRegistration } from '@/lib/server/ccw-roadshow-email-log';

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
  calendarSynced: boolean;
  createdAt: Date;
  attendees: { fullName: string; yearsExperience: string; goals: string }[];
  /**
   * Latest email outcome for this registration.
   * `null` = no send was ever ATTEMPTED (or it predates email logging) — which is
   * itself the answer to "was this person emailed?".
   */
  email: {
    lastKind: string | null;
    lastStatus: string | null;
    lastAttemptAt: Date | null;
    failureReason: string | null;
    everSent: boolean;
  } | null;
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

  return runSerializable(async (tx) => {
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

  const emailStatus = await getEmailStatusByRegistration(rows.map((r) => r.id));

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
    calendarSynced: row.calendarSynced,
    createdAt: row.createdAt,
    attendees: row.attendees.map((a) => ({
      fullName: a.fullName,
      yearsExperience: a.yearsExperience,
      goals: a.goals,
    })),
    email: emailStatus.get(row.id) ?? null,
  }));
}

export async function promoteRegistration(
  registrationId: string,
  event: CcwRoadshowEvent,
): Promise<{ status: RegistrationStatus; remaining: number }> {
  return runSerializable(async (tx) => {
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

export async function getRoadshowRegistrationForCalendarSync(registrationId: string) {
  return prisma.ccwRoadshowRegistration.findUnique({
    where: { id: registrationId },
    include: { attendees: { take: 1, orderBy: { createdAt: 'asc' } } },
  });
}

/** Remove a registration (and its attendees, via cascade). Frees its seats. */
export async function deleteRoadshowRegistration(registrationId: string): Promise<void> {
  await prisma.ccwRoadshowRegistration.delete({ where: { id: registrationId } });
}
