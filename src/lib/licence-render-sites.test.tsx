/**
 * Render audit (licence inventory, 18/10/2026): every site that printed an IICRC discipline code
 * or designation name on a CARSI surface. Codes are routing data; what renders is a CARSI
 * subject, and a pathway never "builds toward" an IICRC certification.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href }, children),
}));

import { CERT_LEVELS, DISCIPLINES } from '@/components/tools/CECCalculator';
import { CertificateArt } from '@/lib/certificate/CertificateArt';
import {
  disciplineTopicLabel,
  IICRC_DISCIPLINE_LONG,
  publicPathwayTarget,
} from '@/lib/iicrc-discipline-display';

describe('render sites print subjects, never codes or IICRC designations', () => {
  it('render: a course or pathway discipline renders as a subject, never the code', () => {
    expect(disciplineTopicLabel('WRT')).toBe('Water Restoration');
    expect(disciplineTopicLabel('crt')).toBe('Carpet Cleaning');
    expect(disciplineTopicLabel('RRT')).toBeNull();
    expect(disciplineTopicLabel(null)).toBeNull();
  });

  it.each([
    `IICRC ${'W' + 'RT'}`, // assembled so this file never spells the banned construction
    'WRT certification',
    'Water Damage Restoration Technician (WRT)',
    'IICRC certification',
  ])(
    'render: a pathway target naming the IICRC, a certification or a code is suppressed: %s',
    (target) => {
      expect(publicPathwayTarget(target)).toBeNull();
    }
  );

  it('render: a CARSI target still shows (control)', () => {
    expect(publicPathwayTarget('CARSI Water Restoration Practitioner')).toBe(
      'CARSI Water Restoration Practitioner'
    );
  });

  it('render: the certificate names the CARSI subject and never calls the programme accredited', () => {
    const html = renderToStaticMarkup(
      createElement(CertificateArt, { logoSrc: '/logo.png', discipline: 'WRT', courseName: 'X' })
    );
    expect(html).toContain('Water Restoration');
    expect(html).not.toContain(IICRC_DISCIPLINE_LONG.WRT);
    expect(html).not.toMatch(/accredited\s+programme/);
  });
});

describe('CEC calculator states the IICRC renewal rule correctly', () => {
  it('calculator: 14 CECs every four years, or every two for Master (iicrc.org/ausfaqs)', () => {
    for (const d of DISCIPLINES) {
      expect(d.cecsPerCycle.technician, d.code).toBe(14);
      expect(d.cecsPerCycle.master, d.code).toBe(14);
    }
    expect(CERT_LEVELS.find((l) => l.value === 'technician')?.description).toBe(
      '14 CECs every four years'
    );
    expect(CERT_LEVELS.find((l) => l.value === 'master')?.description).toBe(
      '14 CECs every two years'
    );
  });

  it('calculator: discipline names are the issuer’s own', () => {
    for (const d of DISCIPLINES) expect(d.name, d.code).toBe(IICRC_DISCIPLINE_LONG[d.code]);
  });

  it('calculator: no CTA brands courses with a code, and no copy says CARSI courses lead to certification', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/tools/CECCalculator.tsx'), 'utf8');
    expect(src).not.toMatch(/Browse \{result\.discipline\.code\}/);
    expect(src).not.toMatch(/To earn your/);
  });
});
