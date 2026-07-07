import { randomUUID } from 'node:crypto';

import { Prisma } from '@/generated/prisma/client';
import { getPrismaClient } from '@/lib/prisma';

export type HubSubmissionInput = {
  submissionType: string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone?: string | null;
  submitterCompany?: string | null;
  submitterRole?: string | null;
  submissionTitle: string;
  submissionUrl?: string | null;
  submissionDescription?: string | null;
  submissionData?: Record<string, unknown>;
  termsAccepted: boolean;
  guidelinesAccepted: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createHubSubmission(
  input: HubSubmissionInput
): Promise<{ id: string; reference: string } | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  const prisma = getPrismaClient();
  if (!prisma.hubSubmission?.create) {
    console.error(
      '[hub-submission] Prisma client is missing hubSubmission — run `npx prisma generate` and restart the dev server',
    );
    return null;
  }

  const id = randomUUID();
  try {
    await prisma.hubSubmission.create({
      data: {
        id,
        submissionType: input.submissionType,
        status: 'pending',
        submitterName: input.submitterName,
        submitterEmail: input.submitterEmail,
        submitterPhone: input.submitterPhone ?? null,
        submitterCompany: input.submitterCompany ?? null,
        submitterRole: input.submitterRole ?? null,
        submissionTitle: input.submissionTitle,
        submissionUrl: input.submissionUrl ?? null,
        submissionDescription: input.submissionDescription ?? null,
        submissionData: (input.submissionData ?? {}) as Prisma.InputJsonValue,
        termsAccepted: input.termsAccepted,
        guidelinesAccepted: input.guidelinesAccepted,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error('[hub-submission] failed to persist submission:', error);
    return null;
  }

  return { id, reference: id.slice(0, 8).toUpperCase() };
}
