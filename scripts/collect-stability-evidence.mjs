#!/usr/bin/env node

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectStabilityEvidence, writeReceiptAtomic } from './stability-evidence/collector.mjs';

export { REQUIRED_CI_JOBS, validateInputs } from './stability-evidence/contract.mjs';
export { lookupCiEvidence } from './stability-evidence/ci.mjs';
export { probeHealthEvidence, runSmokeAttempt } from './stability-evidence/probes.mjs';
export { collectStabilityEvidence, writeReceiptAtomic } from './stability-evidence/collector.mjs';

function parseCli(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith('--')) throw new Error(`Unexpected argument: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${flag}`);
    }
    values[flag.slice(2)] = value;
    index += 1;
  }
  return values;
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  if (!args.output) throw new Error('Missing required argument: --output');
  const outputPath = resolve(args.output);
  const evidenceDir = args['evidence-dir'] ? resolve(args['evidence-dir']) : `${outputPath}.assets`;
  const input = {
    repository: args.repo ?? 'CleanExpo/CARSI',
    gitSha: args['git-sha'],
    baseUrl: args['base-url'],
    environment: args.environment,
    providerDeploymentId: args['deployment-id'],
    smokeAttempts: args['smoke-attempts'] ?? 1,
    evidenceDir,
    cwd: process.cwd(),
    githubToken: process.env.GITHUB_TOKEN,
  };
  const receipt = await collectStabilityEvidence(input);
  const written = await writeReceiptAtomic(outputPath, receipt);
  process.stdout.write(`${JSON.stringify({ output: written, result: receipt.overall.result })}\n`);
  process.exitCode = receipt.overall.result === 'pass' ? 0 : 1;
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`stability evidence collection failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
