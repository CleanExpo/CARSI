/**
 * Every saved Reticle flow must parse under Reticle's own flow-file schema.
 *
 * The schema is strict about `expect` keys, so a typo or an unsupported predicate fails here
 * instead of being dropped at replay and leaving a flow that goes green against nothing.
 * `@reticlehq/core` is the wire-contract package that `@reticlehq/next` and `@reticlehq/react`
 * already install, so this uses the same schema the daemon replays with.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FlowFileSchema } from '@reticlehq/core';
import { describe, expect, it } from 'vitest';

const FLOWS_DIR = join(process.cwd(), '.reticle/flows');

function flowFiles(): string[] {
  const out: string[] = [];
  for (const project of readdirSync(FLOWS_DIR, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    for (const f of readdirSync(join(FLOWS_DIR, project.name))) {
      if (f.endsWith('.json')) out.push(join(FLOWS_DIR, project.name, f));
    }
  }
  return out;
}

describe('saved Reticle flows', () => {
  const files = flowFiles();

  it('finds the flows it is meant to check', () => {
    expect(files.some((f) => f.endsWith('pricing-yearly-not-on-sale.json'))).toBe(true);
  });

  for (const file of files) {
    it(`${file.slice(FLOWS_DIR.length + 1)} parses under FlowFileSchema`, () => {
      const parsed = FlowFileSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
      expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true);
    });
  }

  it('the schema rejects an unsupported expect key (positive control)', () => {
    const flow = JSON.parse(
      readFileSync(join(FLOWS_DIR, 'carsi-0f3ff945/pricing-yearly-not-on-sale.json'), 'utf8')
    );
    flow.steps[0].expect.allOf = [{ kind: 'route', path: '/pricing' }];
    expect(FlowFileSchema.safeParse(flow).success).toBe(false);
  });

  it('pricing-yearly-not-on-sale asserts the disabled yearly buy button itself', () => {
    const flow = FlowFileSchema.parse(
      JSON.parse(
        readFileSync(join(FLOWS_DIR, 'carsi-0f3ff945/pricing-yearly-not-on-sale.json'), 'utf8')
      )
    );
    expect(flow.startPath).toBe('/pricing');
    const step = flow.steps.find(
      (s) => s.anchor.kind === 'testid' && s.anchor.value === 'pricing-pro_annual-coming-soon'
    );
    expect(step).toBeDefined();
    expect(step?.expect?.element).toEqual({ testid: 'pricing-pro_annual-coming-soon' });
    expect(step?.expect?.text).toEqual({ contains: 'Start membership', absent: true });
  });
});
