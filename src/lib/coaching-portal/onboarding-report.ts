import { COACHING_ASSESSMENT_SECTIONS } from '@/lib/coaching-portal/assessment-schema';
import {
  COACHING_SOCIAL_FIELDS,
  type CoachingBusinessProfileForm,
} from '@/lib/coaching-portal/business-profile';
import {
  BRAND,
  brandLink,
  escapeHtml,
  formatPlainMessageAsHtml,
} from '@/lib/server/email-templates';

export type OnboardingSubmitStatements = {
  problemStatement: string;
  goalStatement: string;
  extraNotes: string;
};

export type OnboardingReportMember = {
  fullName: string;
  email: string;
};

const PROFILE_ROWS: Array<{ key: keyof CoachingBusinessProfileForm; label: string }> = [
  { key: 'businessName', label: 'Business name' },
  { key: 'industry', label: 'Industry' },
  { key: 'location', label: 'Location' },
  { key: 'serviceAreas', label: 'Service areas' },
  { key: 'yearsInBusiness', label: 'Years in business' },
  { key: 'businessSize', label: 'Business size' },
  { key: 'employeeCount', label: 'Employees' },
  { key: 'mainServices', label: 'Main services' },
  { key: 'website', label: 'Website' },
  { key: 'challenges', label: 'Challenges (profile)' },
  { key: 'shortTermGoals', label: 'Short-term goals (profile)' },
  { key: 'longTermVision', label: 'Long-term vision' },
  { key: 'socialNotes', label: 'Other listings / social notes' },
];

function displayValue(v: string | null | undefined): string {
  const t = v?.trim();
  return t && t.length > 0 ? t : '—';
}

function urlCell(value: string): string {
  const t = value.trim();
  if (!t) return '—';
  const href = t.startsWith('http') ? t : `https://${t}`;
  return brandLink(href, t);
}

function sectionHeading(title: string, subtitle?: string): string {
  const sub = subtitle
    ? `<p style="margin: 6px 0 0; font-family: ${BRAND.font}; font-size: 14px; line-height: 1.5; color: ${BRAND.textMuted}; font-weight: 400; text-transform: none; letter-spacing: 0;">${escapeHtml(subtitle)}</p>`
    : '';
  return `
    <div style="margin: 0 0 16px;">
      <h3 style="margin: 0; font-family: ${BRAND.font}; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.accentA};">${escapeHtml(title)}</h3>
      ${sub}
    </div>`;
}

function reportCard(inner: string, extraStyle = ''): string {
  return `
    <div style="margin: 0 0 28px; padding: 0; background: rgba(255,255,255,0.02); border: 1px solid ${BRAND.cardBorder}; border-radius: 6px; overflow: hidden; ${extraStyle}">
      ${inner}
    </div>`;
}

function detailsTable(rows: Array<{ label: string; value: string; valueHtml?: string }>): string {
  const inner = rows
    .map(
      (d, i) => `
    <tr>
      <td style="padding: 14px 18px; font-family: ${BRAND.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: ${BRAND.blue}; vertical-align: top; width: 32%; border-bottom: 1px solid ${BRAND.cardBorder}; ${i === rows.length - 1 ? 'border-bottom: none;' : ''}">
        ${escapeHtml(d.label)}
      </td>
      <td style="padding: 14px 18px; font-family: ${BRAND.font}; font-size: 15px; line-height: 1.55; color: ${BRAND.text}; vertical-align: top; border-bottom: 1px solid ${BRAND.cardBorder}; white-space: pre-wrap; ${i === rows.length - 1 ? 'border-bottom: none;' : ''}">
        ${d.valueHtml ?? escapeHtml(d.value)}
      </td>
    </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${inner}</table>`;
}

function glanceCell(label: string, value: string, valueHtml?: string): string {
  return `
    <td style="padding: 20px 22px; vertical-align: top; width: 33.33%; border-right: 1px solid ${BRAND.cardBorder};">
      <p style="margin: 0 0 8px; font-family: ${BRAND.font}; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.textMuted};">${escapeHtml(label)}</p>
      <p style="margin: 0; font-family: ${BRAND.font}; font-size: 16px; font-weight: 600; line-height: 1.4; color: ${BRAND.silverHi};">${valueHtml ?? escapeHtml(value)}</p>
    </td>`;
}

function statementPanel(heading: string, bodyHtml: string, accent: string): string {
  return `
    <td style="padding: 22px 24px; vertical-align: top; width: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%); border-top: 3px solid ${accent};">
      <p style="margin: 0 0 12px; font-family: ${BRAND.font}; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${accent};">${escapeHtml(heading)}</p>
      <div style="font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.text};">${bodyHtml}</div>
    </td>`;
}

export function buildOnboardingReportHtml(params: {
  member: OnboardingReportMember;
  profile: CoachingBusinessProfileForm;
  assessmentResponses: Record<string, string>;
  statements: OnboardingSubmitStatements;
  submittedAtIso: string;
}): string {
  const { member, profile, assessmentResponses, statements, submittedAtIso } = params;
  const businessName = displayValue(profile.businessName);
  const submittedLabel = new Date(submittedAtIso).toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const atAGlance = reportCard(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, rgba(36,144,237,0.12) 0%, rgba(184,230,46,0.06) 100%);">
      <tr>
        ${glanceCell('Business', businessName)}
        ${glanceCell('Member', displayValue(member.fullName))}
        <td style="padding: 20px 22px; vertical-align: top; width: 33.33%;">
      <p style="margin: 0 0 8px; font-family: ${BRAND.font}; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.textMuted};">Email</p>
      <p style="margin: 0; font-family: ${BRAND.font}; font-size: 16px; font-weight: 600; line-height: 1.4; color: ${BRAND.silverHi};">${member.email.trim() ? brandLink(`mailto:${member.email}`, member.email) : '—'}</p>
    </td>
      </tr>
      <tr>
        <td colspan="3" style="padding: 12px 22px 18px; font-family: ${BRAND.font}; font-size: 12px; color: ${BRAND.textMuted}; border-top: 1px solid ${BRAND.cardBorder};">
          Submitted ${escapeHtml(submittedLabel)} (Sydney)
        </td>
      </tr>
    </table>
  `);

  const priorities = reportCard(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        ${statementPanel('Biggest problem', formatPlainMessageAsHtml(statements.problemStatement), BRAND.orange)}
        ${statementPanel('What success looks like', formatPlainMessageAsHtml(statements.goalStatement), BRAND.cyan)}
      </tr>
      ${
        statements.extraNotes.trim()
          ? `
      <tr>
        <td colspan="2" style="padding: 18px 24px 22px; border-top: 1px solid ${BRAND.cardBorder};">
          <p style="margin: 0 0 10px; font-family: ${BRAND.font}; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${BRAND.blue};">Notes for your coach</p>
          <div style="font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.text};">${formatPlainMessageAsHtml(statements.extraNotes)}</div>
        </td>
      </tr>`
          : ''
      }
    </table>
  `);

  const profileRows = PROFILE_ROWS.map(({ key, label }) => ({
    label,
    value: displayValue(profile[key]),
    valueHtml: key === 'website' && profile[key].trim() ? urlCell(profile[key]) : undefined,
  }));

  const socialRows = COACHING_SOCIAL_FIELDS.map(({ key, label }) => ({
    label,
    value: displayValue(profile[key]),
    valueHtml: profile[key].trim() ? urlCell(profile[key]) : undefined,
  }));

  const assessmentBlocks = COACHING_ASSESSMENT_SECTIONS.map((section) => {
    const rows = section.fields.map((field) => ({
      label: field.label,
      value: displayValue(assessmentResponses[field.id]),
      valueHtml:
        field.type === 'url' && assessmentResponses[field.id]?.trim()
          ? urlCell(assessmentResponses[field.id])
          : undefined,
    }));
    return reportCard(
      `<div style="padding: 22px 24px 8px;">${sectionHeading(section.title)}</div>${detailsTable(rows)}`
    );
  }).join('');

  return `
    <div style="font-family: ${BRAND.font}; color: ${BRAND.text};">
      ${atAGlance}
      <div style="margin: 0 0 12px;">${sectionHeading('Coach priorities', 'What the member asked you to focus on first.')}</div>
      ${priorities}
      <div style="margin: 32px 0 12px;">${sectionHeading('Business profile')}</div>
      ${reportCard(detailsTable(profileRows))}
      <div style="margin: 32px 0 12px;">${sectionHeading('Web & social')}</div>
      ${reportCard(detailsTable(socialRows))}
      <div style="margin: 32px 0 12px;">${sectionHeading('Business assessment', 'Full questionnaire responses.')}</div>
      ${assessmentBlocks}
    </div>`;
}

export function buildOnboardingReportPlainText(params: {
  member: OnboardingReportMember;
  profile: CoachingBusinessProfileForm;
  assessmentResponses: Record<string, string>;
  statements: OnboardingSubmitStatements;
  submittedAtIso: string;
}): string {
  const { member, profile, assessmentResponses, statements, submittedAtIso } = params;
  const lines: string[] = [
    '=== CARSI Business Coaching — onboarding packet ===',
    '',
    `Business: ${displayValue(profile.businessName)}`,
    `Member: ${displayValue(member.fullName)}`,
    `Email: ${displayValue(member.email)}`,
    `Submitted: ${submittedAtIso}`,
    '',
    '--- Coach priorities ---',
    '',
    'Biggest problem:',
    statements.problemStatement,
    '',
    'Success / goal:',
    statements.goalStatement,
  ];

  if (statements.extraNotes.trim()) {
    lines.push('', 'Notes for your coach:', statements.extraNotes);
  }

  lines.push('', '--- Business profile ---', '');
  for (const { key, label } of PROFILE_ROWS) {
    lines.push(`${label}: ${displayValue(profile[key])}`);
  }

  lines.push('', '--- Web & social ---', '');
  for (const { key, label } of COACHING_SOCIAL_FIELDS) {
    lines.push(`${label}: ${displayValue(profile[key])}`);
  }

  lines.push('', '--- Business assessment ---', '');
  for (const section of COACHING_ASSESSMENT_SECTIONS) {
    lines.push(`[${section.title}]`);
    for (const field of section.fields) {
      lines.push(`  ${field.label}: ${displayValue(assessmentResponses[field.id])}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
