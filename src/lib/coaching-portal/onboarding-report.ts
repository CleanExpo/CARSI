import { COACHING_ASSESSMENT_SECTIONS } from '@/lib/coaching-portal/assessment-schema';
import {
  COACHING_SOCIAL_FIELDS,
  type CoachingBusinessProfileForm,
} from '@/lib/coaching-portal/business-profile';
import { brandLink, escapeHtml, formatPlainMessageAsHtml } from '@/lib/server/email-templates';

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

function sectionHeading(title: string): string {
  return `<h3 style="margin: 24px 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #2490ed;">${escapeHtml(title)}</h3>`;
}

function detailsTable(rows: Array<{ label: string; value: string; valueHtml?: string }>): string {
  const inner = rows
    .map(
      (d) => `
    <tr>
      <td style="padding: 10px 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #2490ed; vertical-align: top; width: 36%; border-bottom: 1px solid rgba(255,255,255,0.07);">
        ${escapeHtml(d.label)}
      </td>
      <td style="padding: 10px 12px; font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.95); vertical-align: top; border-bottom: 1px solid rgba(255,255,255,0.07); white-space: pre-wrap;">
        ${d.valueHtml ?? escapeHtml(d.value)}
      </td>
    </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 2px;">${inner}</table>`;
}

export function buildOnboardingReportHtml(params: {
  member: OnboardingReportMember;
  profile: CoachingBusinessProfileForm;
  assessmentResponses: Record<string, string>;
  statements: OnboardingSubmitStatements;
  submittedAtIso: string;
}): string {
  const { member, profile, assessmentResponses, statements, submittedAtIso } = params;

  const memberRows = [
    { label: 'Name', value: displayValue(member.fullName) },
    { label: 'Email', value: displayValue(member.email) },
    {
      label: 'Submitted',
      value: new Date(submittedAtIso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }),
    },
  ];

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
    return `${sectionHeading(section.title)}${detailsTable(rows)}`;
  }).join('');

  const statementRows = [
    {
      label: 'Biggest problem (member)',
      value: statements.problemStatement,
      valueHtml: formatPlainMessageAsHtml(statements.problemStatement),
    },
    {
      label: 'Success / goal (member)',
      value: statements.goalStatement,
      valueHtml: formatPlainMessageAsHtml(statements.goalStatement),
    },
    ...(statements.extraNotes.trim()
      ? [
          {
            label: 'Notes for Phill',
            value: statements.extraNotes,
            valueHtml: formatPlainMessageAsHtml(statements.extraNotes),
          },
        ]
      : []),
  ];

  return [
    sectionHeading('Member'),
    detailsTable(memberRows),
    sectionHeading('Message to coach'),
    detailsTable(statementRows),
    sectionHeading('Business profile'),
    detailsTable(profileRows),
    sectionHeading('Web & social'),
    detailsTable(socialRows),
    sectionHeading('Business assessment'),
    assessmentBlocks,
  ].join('');
}

export function buildOnboardingReportPlainText(params: {
  member: OnboardingReportMember;
  profile: CoachingBusinessProfileForm;
  assessmentResponses: Record<string, string>;
  statements: OnboardingSubmitStatements;
  submittedAtIso: string;
}): string {
  const lines: string[] = [
    'CARSI Business Coaching — onboarding submission',
    `Submitted: ${params.submittedAtIso}`,
    '',
    '--- Member ---',
    `Name: ${params.member.fullName}`,
    `Email: ${params.member.email}`,
    '',
    '--- Message to coach ---',
    `Problem: ${params.statements.problemStatement}`,
    `Goal: ${params.statements.goalStatement}`,
  ];
  if (params.statements.extraNotes.trim()) {
    lines.push(`Notes: ${params.statements.extraNotes}`);
  }
  lines.push('', '--- Business profile ---');
  for (const { key, label } of PROFILE_ROWS) {
    lines.push(`${label}: ${displayValue(params.profile[key])}`);
  }
  lines.push('', '--- Web & social ---');
  for (const { key, label } of COACHING_SOCIAL_FIELDS) {
    lines.push(`${label}: ${displayValue(params.profile[key])}`);
  }
  lines.push('', '--- Assessment ---');
  for (const section of COACHING_ASSESSMENT_SECTIONS) {
    lines.push(`[${section.title}]`);
    for (const field of section.fields) {
      lines.push(`${field.label}: ${displayValue(params.assessmentResponses[field.id])}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
