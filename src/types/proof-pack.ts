/** A citation from the course's lesson source lists (BACKLOG #26). Linked, never embedded. */
export type ProofPackReference = {
  label: string;
  /** Absolute http(s) URL, or null for a source cited by name only. */
  url: string | null;
  /** "dd/mm/yyyy" read date as the lesson gives it, or null. */
  read_on: string | null;
};

export type ProofPackCredentialRow = {
  credential_id: string;
  course_title: string;
  iicrc_discipline: string | null;
  cec_hours: number;
  issued_date: string;
  verification_url: string;
  /** Reference material cited by the course; empty when it cites none. */
  references: ProofPackReference[];
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
