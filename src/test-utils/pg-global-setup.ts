import { assertPgSuiteAllowed } from './pg-disposable';

/** vitest.pg.config.ts globalSetup: refuse before any *.pg.test.ts is collected. */
export default function setup(): void {
  assertPgSuiteAllowed(process.env);
}
