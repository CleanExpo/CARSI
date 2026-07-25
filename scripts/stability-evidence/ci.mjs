import { REQUIRED_CI_JOBS } from './contract.mjs';

async function githubJson(url, { token, fetchImpl }) {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'carsi-stability-evidence-collector',
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = ['Bearer', token].join(' ');

  const response = await fetchImpl(url, { headers, redirect: 'error' });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
  return response.json();
}

export async function lookupCiEvidence({ repository, gitSha, token, fetchImpl = fetch }) {
  const encodedRepository = repository
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const runsUrl =
    `https://api.github.com/repos/${encodedRepository}/actions/workflows/ci.yml/runs` +
    `?head_sha=${encodeURIComponent(gitSha)}&status=completed&per_page=100`;

  try {
    const runsPayload = await githubJson(runsUrl, { token, fetchImpl });
    const runs = Array.isArray(runsPayload.workflow_runs) ? runsPayload.workflow_runs : [];
    const run = runs.find(
      (candidate) =>
        typeof candidate?.head_sha === 'string' &&
        candidate.head_sha.toLowerCase() === gitSha.toLowerCase()
    );

    if (!run) {
      return {
        outcome: 'unverified',
        requestedSha: gitSha,
        matchedSha: null,
        workflow: 'ci.yml',
        runId: null,
        runUrl: null,
        conclusion: null,
        requiredJobs: [],
        reasons: [`No completed CI workflow run matched the exact SHA ${gitSha}`],
      };
    }

    const jobsUrl = `https://api.github.com/repos/${encodedRepository}/actions/runs/${run.id}/jobs?per_page=100`;
    const jobsPayload = await githubJson(jobsUrl, { token, fetchImpl });
    const jobs = Array.isArray(jobsPayload.jobs) ? jobsPayload.jobs : [];
    const requiredJobs = REQUIRED_CI_JOBS.map((name) => {
      const job = jobs.find((candidate) => candidate?.name === name);
      return { name, conclusion: job?.conclusion ?? null, url: job?.html_url ?? null };
    });
    const missingOrSkipped = requiredJobs.filter(
      ({ conclusion }) => conclusion === null || conclusion === 'skipped'
    );
    const failed = requiredJobs.filter(
      ({ conclusion }) =>
        conclusion !== null && conclusion !== 'success' && conclusion !== 'skipped'
    );
    const reasons = [];
    let outcome = 'pass';

    if (run.conclusion !== 'success') {
      outcome = 'fail';
      reasons.push(`Exact-SHA CI workflow concluded ${run.conclusion ?? 'without a result'}`);
    }
    if (failed.length > 0) {
      outcome = 'fail';
      reasons.push(
        `Required CI jobs did not succeed: ${failed
          .map(({ name, conclusion }) => `${name}=${conclusion}`)
          .join(', ')}`
      );
    }
    if (missingOrSkipped.length > 0) {
      if (outcome !== 'fail') outcome = 'unverified';
      reasons.push(
        `Required CI jobs were missing or skipped: ${missingOrSkipped
          .map(({ name, conclusion }) => `${name}=${conclusion ?? 'missing'}`)
          .join(', ')}`
      );
    }

    return {
      outcome,
      requestedSha: gitSha,
      matchedSha: run.head_sha,
      workflow: 'ci.yml',
      runId: run.id,
      runUrl: run.html_url ?? null,
      conclusion: run.conclusion ?? null,
      requiredJobs,
      reasons,
    };
  } catch (error) {
    return {
      outcome: 'unverified',
      requestedSha: gitSha,
      matchedSha: null,
      workflow: 'ci.yml',
      runId: null,
      runUrl: null,
      conclusion: null,
      requiredJobs: [],
      reasons: [`CI lookup could not be verified: ${error.message}`],
    };
  }
}
