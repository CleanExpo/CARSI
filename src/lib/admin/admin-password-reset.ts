import { validateNewPassword } from '@/lib/auth/password-policy';
import { prisma } from '@/lib/prisma';
import { hashPassword, setPasswordEndingSessions } from '@/lib/server/lms-auth';
import { generateMemberTempPassword } from '@/lib/server/member-temp-password';
import { sendAdminPasswordResetEmail } from '@/lib/server/transactional-email';

export async function adminResetUserPassword(params: {
  userId: string;
  password?: string | null;
  sendEmail?: boolean;
  appOrigin: string;
  initiatedByAdminEmail: string;
}): Promise<{
  password: string;
  email: string;
  emailSent: boolean;
  generated: boolean;
}> {
  const userId = params.userId.trim();
  if (!userId) throw new Error('INVALID_USER');

  const user = await prisma.lmsUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) throw new Error('USER_NOT_FOUND');

  const customPassword = params.password?.trim() || '';
  const generated = !customPassword;
  const plainPassword = generated ? generateMemberTempPassword() : customPassword;

  const policyError = validateNewPassword(plainPassword);
  if (policyError) throw new Error('INVALID_PASSWORD');

  // GP-760: a reset ends every older session of this member (setPasswordEndingSessions).
  await setPasswordEndingSessions(user.id, await hashPassword(plainPassword), { isActive: true });

  let emailSent = false;
  if (params.sendEmail) {
    const emailResult = await sendAdminPasswordResetEmail({
      to: user.email,
      memberName: user.fullName,
      memberEmail: user.email,
      temporaryPassword: plainPassword,
      appOrigin: params.appOrigin,
    });
    emailSent = emailResult.sent;
  }

  console.info(
    '[admin/password-reset]',
    params.initiatedByAdminEmail,
    'reset password for',
    user.email,
    emailSent ? '(emailed)' : '(not emailed)',
  );

  return {
    password: plainPassword,
    email: user.email,
    emailSent,
    generated,
  };
}
