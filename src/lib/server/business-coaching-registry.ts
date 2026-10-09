import {
    computeAvailability,
    decideRegistrationStatus,
    type BusinessCoachingSession,
    type RegistrationStatus,
} from '@/lib/marketing/business-coaching';
import { prisma } from '@/lib/prisma';
import { runSerializable } from '@/lib/server/db-tx';

export type BusinessCoachingAttendeeInput = { fullName: string };

export type FulfillBusinessCoachingInput = {
  session: BusinessCoachingSession;
  stripeSessionId: string;
  packageId: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  attendees: BusinessCoachingAttendeeInput[];
  amountTotalCents: number | null;
};

export type FulfillBusinessCoachingResult = {
  registrationId: string;
  status: RegistrationStatus;
  seatCount: number;
  remaining: number;
  alreadyFulfilled: boolean;
};

async function sumConfirmedSeats(tx: typeof prisma, sessionSlug: string): Promise<number> {
  const aggregate = await tx.businessCoachingRegistration.aggregate({
    _sum: { seatCount: true },
    where: { sessionSlug, status: 'confirmed' },
  });
  return aggregate._sum.seatCount ?? 0;
}

export async function getBusinessCoachingAvailability(sessionSlug: string, capacity: number) {
  const confirmedSeats = await sumConfirmedSeats(prisma, sessionSlug);
  return computeAvailability({ capacity, confirmedSeats });
}

export async function fulfillBusinessCoachingRegistration(
  input: FulfillBusinessCoachingInput,
): Promise<FulfillBusinessCoachingResult> {
  const existing = await prisma.businessCoachingRegistration.findUnique({
    where: { stripeSessionId: input.stripeSessionId },
  });
  if (existing) {
    const confirmedSeats = await sumConfirmedSeats(prisma, input.session.slug);
    const remaining = Math.max(0, input.session.capacity - confirmedSeats);
    return {
      registrationId: existing.id,
      status: existing.status as RegistrationStatus,
      seatCount: existing.seatCount,
      remaining,
      alreadyFulfilled: true,
    };
  }

  const seatCount = input.attendees.length;

  return runSerializable(async (tx) => {
    const confirmedSeats = await sumConfirmedSeats(tx as typeof prisma, input.session.slug);
    const { status } = decideRegistrationStatus({
      confirmedSeats,
      requestedSeats: seatCount,
      capacity: input.session.capacity,
    });

    const registration = await tx.businessCoachingRegistration.create({
      data: {
        sessionSlug: input.session.slug,
        stripeSessionId: input.stripeSessionId,
        companyName: input.companyName || null,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone || null,
        seatCount,
        packageId: input.packageId,
        status,
        amountTotalCents: input.amountTotalCents,
        attendees: {
          create: input.attendees.map((a) => ({ fullName: a.fullName })),
        },
      },
    });

    const confirmedAfter = status === 'confirmed' ? confirmedSeats + seatCount : confirmedSeats;
    const remaining = Math.max(0, input.session.capacity - confirmedAfter);

    return {
      registrationId: registration.id,
      status,
      seatCount,
      remaining,
      alreadyFulfilled: false,
    };
  });
}

export type BusinessCoachingRegistryRow = {
  registrationId: string;
  sessionSlug: string;
  status: RegistrationStatus;
  companyName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  seatCount: number;
  packageId: string;
  amountTotalCents: number | null;
  stripeSessionId: string | null;
  createdAt: Date;
  attendees: { fullName: string }[];
};

export async function listBusinessCoachingRegistry(
  sessionSlug?: string,
): Promise<BusinessCoachingRegistryRow[]> {
  const rows = await prisma.businessCoachingRegistration.findMany({
    where: sessionSlug ? { sessionSlug } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { attendees: { orderBy: { createdAt: 'asc' } } },
  });
  return rows.map((r) => ({
    registrationId: r.id,
    sessionSlug: r.sessionSlug,
    status: r.status as RegistrationStatus,
    companyName: r.companyName,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    seatCount: r.seatCount,
    packageId: r.packageId,
    amountTotalCents: r.amountTotalCents,
    stripeSessionId: r.stripeSessionId,
    createdAt: r.createdAt,
    attendees: r.attendees.map((a) => ({ fullName: a.fullName })),
  }));
}
