/**
 * Set or create an LMS user password (bcrypt) for local/staging debugging.
 * Usage: npx tsx scripts/ensure-lms-user-password.ts <email> <plainPassword>
 *
 * Loads `.env` for DATABASE_URL. Optionally links `admin` role if `lms_roles` has it.
 *
 * IMPORTANT: `import 'dotenv/config'` must run before any import of `@/lib/prisma`.
 * ES modules hoist static imports; calling `config()` after imports is too late — Prisma
 * would otherwise use the placeholder URL (`prisma:prisma`) and fail with P1000.
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { prisma } from '../src/lib/prisma';
import { hashPassword, setPasswordEndingSessions } from '../src/lib/server/lms-auth';

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  if (!emailArg || !password) {
    console.error('Usage: npx tsx scripts/ensure-lms-user-password.ts <email> <plainPassword>');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const hashedPassword = await hashPassword(password);

  const existing = await prisma.lmsUser.findUnique({ where: { email: emailArg } });

  if (existing) {
    // GP-760: a new password ends the account's older sessions.
    await setPasswordEndingSessions(existing.id, hashedPassword, { isActive: true });
    console.log(`Updated password for ${emailArg} (id ${existing.id})`);
  } else {
    const id = randomUUID();
    await prisma.lmsUser.create({
      data: {
        id,
        email: emailArg,
        hashedPassword,
        fullName: emailArg.split('@')[0] ?? 'User',
        isActive: true,
        isVerified: true,
        role: 'admin',
      },
    });
    console.log(`Created user ${emailArg} (id ${id})`);

    const adminRole = await prisma.lmsRole.findUnique({ where: { name: 'admin' } });
    if (adminRole) {
      try {
        await prisma.lmsUserRole.create({
          data: { userId: id, roleId: adminRole.id },
        });
        console.log('Linked lms_user_roles → admin');
      } catch {
        // duplicate or missing FK — ignore
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
