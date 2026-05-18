import { sendEmail, isEmailConfigured } from '@/lib/server/email';
import {
  renderPasswordResetEmail,
  renderRegistrationWelcomeEmail,
} from '@/lib/server/email-templates';

export async function sendPasswordResetEmail(params: {
  to: string;
  resetLink: string;
  fullName?: string | null;
  appOrigin: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const name = params.fullName?.trim() || params.to.split('@')[0];
  const { html, text } = renderPasswordResetEmail({
    appOrigin: params.appOrigin,
    name,
    resetLink: params.resetLink,
  });

  return sendEmail({
    to: params.to,
    subject: 'Reset your CARSI password',
    html,
    text,
  });
}

export async function sendRegistrationWelcomeEmail(params: {
  to: string;
  fullName: string;
  dashboardUrl: string;
  appOrigin: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const name = params.fullName.trim() || params.to.split('@')[0];
  const { html, text } = renderRegistrationWelcomeEmail({
    appOrigin: params.appOrigin,
    name,
    dashboardUrl: params.dashboardUrl,
  });

  return sendEmail({
    to: params.to,
    subject: 'Welcome to CARSI Learning',
    html,
    text,
  });
}

export { isEmailConfigured };
