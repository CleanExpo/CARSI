import { sendEmail, isEmailConfigured } from '@/lib/server/email';

export async function sendPasswordResetEmail(params: {
  to: string;
  resetLink: string;
  fullName?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const name = params.fullName?.trim() || params.to.split('@')[0];
  const { resetLink } = params;

  return sendEmail({
    to: params.to,
    subject: 'Reset your CARSI password',
    html: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>We received a request to reset your CARSI Learning password.</p>
      <p><a href="${resetLink}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
      <p>— CARSI Learning</p>
    `,
    text: `Hi ${name},\n\nReset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
  });
}

export async function sendRegistrationWelcomeEmail(params: {
  to: string;
  fullName: string;
  dashboardUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const name = params.fullName.trim() || params.to.split('@')[0];

  return sendEmail({
    to: params.to,
    subject: 'Welcome to CARSI Learning',
    html: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your CARSI Learning account is ready.</p>
      <p><a href="${params.dashboardUrl}">Go to your dashboard</a></p>
      <p>— CARSI Learning</p>
    `,
    text: `Hi ${name},\n\nYour account is ready. Open your dashboard: ${params.dashboardUrl}`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { isEmailConfigured };
