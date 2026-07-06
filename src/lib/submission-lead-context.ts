export type SubmissionLeadContext = {
  source?: string;
  intent?: string;
  pageUrl?: string;
};

export function buildSubmissionLeadContext(
  params: Record<string, string | string[] | undefined>
): SubmissionLeadContext | undefined {
  const first = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.replace(/[<>]/g, '').trim();
  };

  const source = first('source');
  const intent = first('intent');
  if (!source && !intent) return undefined;

  return {
    source: source?.slice(0, 48),
    intent: intent?.slice(0, 80),
    pageUrl:
      source === 'professional-directory' ? '/professional-directory' : undefined,
  };
}

export function buildSubmissionFormDefaults(
  submissionType: string,
  leadContext?: SubmissionLeadContext
): Partial<{
  submission_title: string;
  submission_description: string;
}> {
  if (
    submissionType === 'professional' &&
    leadContext?.source === 'professional-directory'
  ) {
    return {
      submission_description:
        'Professional directory profile for review ahead of the NRPG-verified CARSI directory launch. Business location, disciplines, IICRC certifications, and service areas are included below.',
    };
  }
  return {};
}
