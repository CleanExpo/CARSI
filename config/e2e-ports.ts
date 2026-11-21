// The three E2E web servers (main, membership, purchase survey) must listen on three different
// ports. They are chosen here, in one place, so no fallback can be picked before every explicit
// value is known (UNI-3472): explicit E2E_PORT* values are reserved first, and a default is the
// first candidate not held by any other server.
export interface E2EPortEnv {
  E2E_PORT?: string;
  PORT?: string;
  E2E_PORT_2?: string;
  E2E_PORT_3?: string;
}

const MEMBERSHIP_CANDIDATES = ['3100', '3102', '3104'];
const SURVEY_CANDIDATES = ['3101', '3103', '3105'];

export function allocateE2EPorts(
  env: Partial<Record<keyof E2EPortEnv, string | undefined>> & Record<string, string | undefined>
): {
  main: string;
  membership: string;
  survey: string;
} {
  const main = env.E2E_PORT || env.PORT || '3000';
  const explicit2 = env.E2E_PORT_2 || undefined;
  const explicit3 = env.E2E_PORT_3 || undefined;
  if (explicit2 && explicit3 && explicit2 === explicit3) {
    throw new Error(
      `E2E_PORT_2 and E2E_PORT_3 are both ${explicit2}; the servers need different ports`
    );
  }
  const free = (candidates: string[], taken: Array<string | undefined>) =>
    candidates.find((p) => !taken.includes(p))!;
  const membership = explicit2 ?? free(MEMBERSHIP_CANDIDATES, [main, explicit3]);
  const survey = explicit3 ?? free(SURVEY_CANDIDATES, [main, membership]);
  return { main, membership, survey };
}
