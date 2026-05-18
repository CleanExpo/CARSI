/**
 * CARSI branded transactional email layout — site theme (#060a14, glass card, #ed9d24 CTAs).
 * All project emails should use buildCarsiEmailHtml / render* helpers below.
 */

export const BRAND = {
  pageBg: '#060a14',
  glow: 'rgba(36, 144, 237, 0.08)',
  cardBg: 'rgba(255, 255, 255, 0.04)',
  cardBorder: 'rgba(255, 255, 255, 0.07)',
  silver: '#c8ced9',
  silverHi: '#e8ebf2',
  accentA: '#b8e62e',
  blue: '#2490ed',
  cyan: '#00F5FF',
  orange: '#ed9d24',
  text: 'rgba(255, 255, 255, 0.95)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  textDim: 'rgba(255, 255, 255, 0.35)',
  font:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function brandLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color: ${BRAND.cyan}; text-decoration: underline; text-underline-offset: 3px;">${escapeHtml(label)}</a>`;
}

export function formatPlainMessageAsHtml(message: string): string {
  return escapeHtml(message.trim()).replace(/\n/g, '<br>');
}

export function buildCarsiWordmarkHtml(appOrigin: string): string {
  const home = escapeHtml(appOrigin);
  const letterBase = `font-family: ${BRAND.font}; font-weight: 800; font-size: 42px; line-height: 1; letter-spacing: 0.14em;`;
  const silver = `color: ${BRAND.silverHi}; text-shadow: 0 1px 0 ${BRAND.silver}, 0 2px 8px rgba(0,0,0,0.5);`;

  return `
    <a href="${home}" style="text-decoration: none; display: inline-block;">
      <span style="${letterBase} display: inline-block;">
        <span style="${silver}">C</span><span style="color: ${BRAND.accentA}; text-shadow: 0 0 20px rgba(184,230,46,0.55), 0 1px 0 #8fc920;">A</span><span style="${silver}">R</span><span style="${silver}">S</span><span style="${silver}">I</span>
      </span>
    </a>
    <p style="margin: 12px 0 0; font-family: ${BRAND.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.blue};">
      IICRC CEC-approved restoration training
    </p>`;
}

export type CarsiEmailDetail = { label: string; value: string };

export type CarsiEmailContent = {
  appOrigin: string;
  preheader: string;
  eyebrow: string;
  title: string;
  greeting?: string;
  paragraphs?: string[];
  details?: CarsiEmailDetail[];
  messageHtml?: string;
  cta?: { label: string; href: string };
  noteHtml?: string;
};

export function buildCarsiEmailHtml(options: CarsiEmailContent): string {
  const preheader = escapeHtml(options.preheader);
  const title = escapeHtml(options.title);
  const eyebrow = escapeHtml(options.eyebrow);
  const wordmark = buildCarsiWordmarkHtml(options.appOrigin);

  const greetingBlock = options.greeting
    ? `
      <tr>
        <td style="padding: 0 0 18px; font-family: ${BRAND.font}; font-size: 16px; line-height: 1.5; color: ${BRAND.text};">
          ${escapeHtml(options.greeting)}
        </td>
      </tr>`
    : '';

  const bodyParagraphs = (options.paragraphs ?? [])
    .map(
      (p) => `
      <tr>
        <td style="padding: 0 0 16px; font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.textMuted};">
          ${escapeHtml(p)}
        </td>
      </tr>`
    )
    .join('');

  const detailsBlock =
    options.details && options.details.length > 0
      ? `
      <tr>
        <td style="padding: 0 0 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(255,255,255,0.03); border: 1px solid ${BRAND.cardBorder}; border-radius: 2px;">
            ${options.details
              .map(
                (d) => `
            <tr>
              <td style="padding: 12px 14px; font-family: ${BRAND.font}; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${BRAND.blue}; vertical-align: top; width: 34%; border-bottom: 1px solid ${BRAND.cardBorder};">
                ${escapeHtml(d.label)}
              </td>
              <td style="padding: 12px 14px; font-family: ${BRAND.font}; font-size: 14px; line-height: 1.5; color: ${BRAND.text}; vertical-align: top; border-bottom: 1px solid ${BRAND.cardBorder};">
                ${escapeHtml(d.value)}
              </td>
            </tr>`
              )
              .join('')}
          </table>
        </td>
      </tr>`
      : '';

  const messageBlock = options.messageHtml
    ? `
      <tr>
        <td style="padding: 0 0 20px;">
          <p style="margin: 0 0 8px; font-family: ${BRAND.font}; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${BRAND.textMuted};">Message</p>
          <div style="font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.text}; padding: 16px; background-color: rgba(255,255,255,0.03); border: 1px solid ${BRAND.cardBorder}; border-radius: 2px;">
            ${options.messageHtml}
          </div>
        </td>
      </tr>`
    : '';


  const ctaBlock = options.cta
    ? `
      <tr>
        <td align="center" style="padding: 10px 0 28px;">
          <a href="${escapeHtml(options.cta.href)}"
             style="display: inline-block; padding: 14px 36px; font-family: ${BRAND.font}; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 2px; background-color: ${BRAND.orange};">
            ${escapeHtml(options.cta.label)}
          </a>
        </td>
      </tr>`
    : '';

  const noteBlock = options.noteHtml
    ? `
      <tr>
        <td style="padding: 20px 0 0; font-family: ${BRAND.font}; font-size: 13px; line-height: 1.55; color: ${BRAND.textDim}; border-top: 1px solid ${BRAND.cardBorder};">
          ${options.noteHtml}
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.pageBg}; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding: 48px 20px 40px; background: radial-gradient(ellipse 80% 50% at 50% 0%, ${BRAND.glow} 0%, transparent 70%);">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px;">
          <tr>
            <td align="center" style="padding: 0 0 32px;">${wordmark}</td>
          </tr>
          <tr>
            <td style="background-color: ${BRAND.cardBg}; border: 1px solid ${BRAND.cardBorder}; border-radius: 2px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height: 2px; background: linear-gradient(90deg, ${BRAND.blue} 0%, ${BRAND.accentA} 50%, ${BRAND.blue} 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 32px 28px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 0 0 6px; font-family: ${BRAND.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: ${BRAND.blue};">${eyebrow}</td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px; font-family: ${BRAND.font}; font-size: 24px; font-weight: 700; line-height: 1.3; color: ${BRAND.text};">${title}</td>
                      </tr>
                      ${greetingBlock}
                      ${bodyParagraphs}
                      ${detailsBlock}
                      ${messageBlock}
                      ${ctaBlock}
                      ${noteBlock}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 28px 8px 0; font-family: ${BRAND.font}; font-size: 12px; line-height: 1.6; color: ${BRAND.textDim};">
              <p style="margin: 0 0 8px; color: ${BRAND.textMuted};">CARSI Learning</p>
              <p style="margin: 0;">${brandLink(options.appOrigin, 'Visit carsi.com.au')}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type RenderedEmail = { html: string; text: string };

function render(content: CarsiEmailContent, textBody: string): RenderedEmail {
  return { html: buildCarsiEmailHtml(content), text: textBody };
}

export function renderPasswordResetEmail(params: {
  appOrigin: string;
  name: string;
  resetLink: string;
}): RenderedEmail {
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Reset your CARSI Learning password',
      eyebrow: 'Account security',
      title: 'Reset your password',
      greeting: `Hi ${params.name},`,
      paragraphs: [
        'We received a request to reset the password for your CARSI Learning account.',
        'Use the button below to choose a new password. This link expires in 1 hour.',
      ],
      cta: { label: 'Reset password', href: params.resetLink },
      noteHtml: `If you did not request this, ignore this email — your password will not change.<br /><br /><span style="color: ${BRAND.textMuted};">Or copy this link:</span><br />${brandLink(params.resetLink, 'Open reset page')}`,
    },
    `Hi ${params.name},\n\nReset your CARSI password:\n${params.resetLink}\n\nThis link expires in 1 hour.`
  );
}

export function renderRegistrationWelcomeEmail(params: {
  appOrigin: string;
  name: string;
  dashboardUrl: string;
}): RenderedEmail {
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Your CARSI Learning account is ready',
      eyebrow: 'Welcome',
      title: "You're all set",
      greeting: `Hi ${params.name},`,
      paragraphs: [
        'Thank you for joining CARSI Learning — professional IICRC-aligned restoration training for Australian technicians and teams.',
        'Your account is active. Sign in to browse courses, track CEC progress, and continue your learning path.',
      ],
      details: [
        { label: 'Account', value: params.name },
        { label: 'Status', value: 'Active' },
      ],
      cta: { label: 'Go to my dashboard', href: params.dashboardUrl },
      noteHtml: `Need help? ${brandLink(`${params.appOrigin}/contact`, 'Contact our team')}.`,
    },
    `Hi ${params.name},\n\nWelcome to CARSI Learning.\n\nDashboard: ${params.dashboardUrl}`
  );
}
