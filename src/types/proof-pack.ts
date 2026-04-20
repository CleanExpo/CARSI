export type ProofPackCredentialRow = {
  credential_id: string;
  course_title: string;
  iicrc_discipline: string | null;
  cec_hours: number;
  issued_date: string;
  verification_url: string;
};

export type ProofPackPayload = {
  schema_version: 1;
  learner_name: string;
  learner_email: string;
  issuing_organisation: string;
  generated_at: string;
  summary: {
    completed_courses: number;
    total_cec_hours: number;
  };
  cec_by_discipline: { discipline: string; cec_hours: number }[];
  credentials: ProofPackCredentialRow[];
};
