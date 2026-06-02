/**
 * Upsert admin login (admin_users) + LMS admin-capable user from env.
 *
 * Uses:
 *   ADMIN_EMAIL — or first entry in ADMIN_PANEL_EMAILS
 *   ADMIN_PASSWORD
 *
 * Usage:
 *   npm run db:seed-admin
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { hash } from 'bcryptjs';

import { prisma } from '../src/lib/prisma';

const BCRYPT_COST = 12;

function resolveAdminEmail(): string {
  const direct = process.env.ADMIN_EMAIL?.trim();
  if (direct) return direct.toLowerCase();
  const panel = process.env.ADMIN_PANEL_EMAILS?.trim();
  if (panel) {
    const first = panel.split(',')[0]?.trim();
    if (first) return first.toLowerCase();
  }
  throw new Error('Set ADMIN_EMAIL or ADMIN_PANEL_EMAILS in .env');
}

function resolveAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) throw new Error('Set ADMIN_PASSWORD in .env');
  return password;
}

async function ensureLmsRole(userId: string, roleName: 'admin' | 'student'): Promise<void> {
  const role = await prisma.lmsRole.upsert({
    where: { name: roleName },
    create: { name: roleName, description: `${roleName} role` },
    update: {},
  });
  await prisma.lmsUserRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    create: { userId, roleId: role.id },
    update: {},
  });
  await prisma.lmsUser.update({
    where: { id: userId },
    data: { role: roleName },
  });
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set');
  }

  const email = resolveAdminEmail();
  const password = resolveAdminPassword();
  const passwordHash = await hash(password, BCRYPT_COST);
  const displayName = email.split('@')[0] ?? 'Admin';

  const adminRow = await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, role: 'admin', isActive: true },
    update: { passwordHash, isActive: true, role: 'admin' },
  });

  let lmsUser = await prisma.lmsUser.findUnique({ where: { email } });
  if (!lmsUser) {
    lmsUser = await prisma.lmsUser.create({
      data: {
        id: randomUUID(),
        email,
        hashedPassword: passwordHash,
        fullName: displayName,
        isActive: true,
        isVerified: true,
        role: 'admin',
      },
    });
  } else {
    lmsUser = await prisma.lmsUser.update({
      where: { id: lmsUser.id },
      data: {
        hashedPassword: passwordHash,
        isActive: true,
        role: 'admin',
      },
    });
  }

  await ensureLmsRole(lmsUser.id, 'admin');

  console.log('[seed-admin] OK');
  console.log(`  admin_users: ${adminRow.email} (id ${adminRow.id})`);
  console.log(`  lms_users:   ${lmsUser.email} (id ${lmsUser.id}, role admin)`);
  console.log('');
  console.log('Sign in at http://localhost:3000/admin');
  console.log(`  Email:    ${email}`);
  console.log('  Password: (value of ADMIN_PASSWORD in .env)');
}

main()
  .catch((err) => {
    console.error('[seed-admin] FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
