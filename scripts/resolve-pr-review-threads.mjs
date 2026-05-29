#!/usr/bin/env node
/**
 * Resolve all unresolved GitHub PR review threads (e.g. CodeRabbit).
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_... node scripts/resolve-pr-review-threads.mjs 158
 *   gh auth token | xargs -I{} env GITHUB_TOKEN={} node scripts/resolve-pr-review-threads.mjs 158
 */
const owner = process.env.GITHUB_OWNER || 'CleanExpo';
const repo = process.env.GITHUB_REPO || 'CARSI';
const prNumber = Number(process.argv[2] || process.env.PR_NUMBER || '158');
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!token?.trim()) {
  console.error('Set GITHUB_TOKEN or GH_TOKEN (e.g. gh auth token).');
  process.exit(1);
}

async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || json, null, 2));
  }
  return json.data;
}

const listQuery = `
  query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes { id isResolved }
        }
      }
    }
  }
`;

const resolveMutation = `
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { id isResolved }
    }
  }
`;

async function listUnresolvedThreads() {
  const threads = [];
  let cursor = null;
  for (;;) {
    const data = await graphql(listQuery, {
      owner,
      repo,
      number: prNumber,
      cursor,
    });
    const batch = data.repository.pullRequest.reviewThreads;
    for (const t of batch.nodes) {
      if (!t.isResolved) threads.push(t.id);
    }
    if (!batch.pageInfo.hasNextPage) break;
    cursor = batch.pageInfo.endCursor;
  }
  return threads;
}

async function main() {
  const ids = await listUnresolvedThreads();
  if (ids.length === 0) {
    console.log(`PR #${prNumber}: no unresolved review threads.`);
    return;
  }
  console.log(`Resolving ${ids.length} thread(s) on ${owner}/${repo}#${prNumber}...`);
  for (const id of ids) {
    await graphql(resolveMutation, { threadId: id });
    console.log('  resolved', id);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
