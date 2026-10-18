'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  GraduationCap,
  Clock,
  BookOpen,
  Award,
  ChevronRight,
  Info,
} from 'lucide-react';
import Link from 'next/link';

import { IICRC_DISCIPLINE_LONG } from '@/lib/iicrc-discipline-display';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ----------------------------------------
   IICRC CEC Requirements Data
   ---------------------------------------- */

type Discipline = 'WRT' | 'CRT' | 'ASD' | 'AMRT' | 'FSRT' | 'OCT' | 'CCT';
type CertLevel = 'none' | 'technician' | 'master';

interface DisciplineInfo {
  code: Discipline;
  name: string;
  description: string;
  /**
   * IICRC renewal rule (https://iicrc.org/ausfaqs/, checked 18/10/2026): 14 CECs every four
   * years; Master and Inspector certifications 14 CECs every two years.
   */
  cecsPerCycle: Record<CertLevel, number>;
  cycleLengthYears: number;
  avgCecsPerCourse: number;
}

export const DISCIPLINES: DisciplineInfo[] = [
  {
    code: 'WRT',
    name: IICRC_DISCIPLINE_LONG.WRT,
    description: 'Flood damage, burst pipes, storm recovery',
    cecsPerCycle: { none: 0, technician: 14, master: 14 },
    cycleLengthYears: 4,
    avgCecsPerCourse: 3,
  },
  {
    code: 'CRT',
    name: IICRC_DISCIPLINE_LONG.CRT,
    description:
      'Carpet colour correction (an IICRC certification; CARSI sells no colour-repair course)',
    cecsPerCycle: { none: 0, technician: 14, master: 14 },
    cycleLengthYears: 4,
    avgCecsPerCourse: 3,
  },
  {
    code: 'ASD',
    name: IICRC_DISCIPLINE_LONG.ASD,
    description: 'Advanced moisture control for structural elements',
    cecsPerCycle: { none: 0, technician: 14, master: 14 },
    cycleLengthYears: 4,
    avgCecsPerCourse: 3,
  },
  {
    code: 'AMRT',
    name: IICRC_DISCIPLINE_LONG.AMRT,
    description: 'Mould assessment and remediation',
    cecsPerCycle: { none: 0, technician: 14, master: 14 },
    cycleLengthYears: 4,
    avgCecsPerCourse: 3,
  },
  {
    code: 'FSRT',
    name: IICRC_DISCIPLINE_LONG.FSRT,
    description: 'Post-fire cleanup and deodorisation',
    cecsPerCycle: { none: 0, technician: 14, master: 14 },
    cycleLengthYears: 4,
    avgCecsPerCourse: 3,
  },
  {
    code: 'OCT',
    name: IICRC_DISCIPLINE_LONG.OCT,
    description: 'Identifying and neutralising odour sources',
    cecsPerCycle: { none: 0, technician: 14, master: 14 },
    cycleLengthYears: 4,
    avgCecsPerCourse: 3,
  },
  {
    code: 'CCT',
    name: IICRC_DISCIPLINE_LONG.CCT,
    description: 'Carpet cleaning in homes and commercial premises',
    cecsPerCycle: { none: 0, technician: 14, master: 14 },
    cycleLengthYears: 4,
    avgCecsPerCourse: 2,
  },
];

export const CERT_LEVELS: { value: CertLevel; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'No Current Certification',
    description: 'Starting fresh — earn your first credential',
  },
  { value: 'technician', label: 'Technician', description: '14 CECs every four years' },
  { value: 'master', label: 'Master Technician', description: '14 CECs every two years' },
];

/* ----------------------------------------
   CEC Calculator Component
   ---------------------------------------- */

export function CECCalculator() {
  const [discipline, setDiscipline] = useState<Discipline | ''>('');
  const [certLevel, setCertLevel] = useState<CertLevel | ''>('');
  const [cecsEarned, setCecsEarned] = useState<number>(0);

  const result = useMemo(() => {
    if (!discipline || !certLevel) return null;

    const disc = DISCIPLINES.find((d) => d.code === discipline);
    if (!disc) return null;

    const required = disc.cecsPerCycle[certLevel];
    const remaining = Math.max(0, required - cecsEarned);
    const coursesNeeded = remaining > 0 ? Math.ceil(remaining / disc.avgCecsPerCourse) : 0;
    // Estimate ~2 hours per CEC of course content
    const estimatedHours = remaining * 2;

    return {
      discipline: disc,
      required,
      remaining,
      coursesNeeded,
      estimatedHours,
      isComplete: remaining === 0 && certLevel !== 'none',
      progress: required > 0 ? Math.min(100, Math.round((cecsEarned / required) * 100)) : 0,
    };
  }, [discipline, certLevel, cecsEarned]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: '#eef7ff' }}
          aria-hidden="true"
        >
          <Calculator className="h-5 w-5" style={{ color: '#2490ed' }} />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-950">
            Calculate Your CEC Needs
          </h2>
          <p className="text-xs text-slate-600">
            Find out how many Continuing Education Credits you need
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Discipline selector */}
        <div className="space-y-2">
          <Label
            htmlFor="cec-discipline"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700"
          >
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Target Discipline
          </Label>
          <Select value={discipline} onValueChange={(val) => setDiscipline(val as Discipline)}>
            <SelectTrigger
              id="cec-discipline"
              className="h-10 border-slate-300 bg-white text-sm text-slate-900"
            >
              <SelectValue placeholder="Select discipline" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900">
              {DISCIPLINES.map((d) => (
                <SelectItem key={d.code} value={d.code} className="text-sm">
                  <span className="font-medium">{d.code}</span>
                  <span className="ml-1.5 text-slate-600">— {d.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Certification level */}
        <div className="space-y-2">
          <Label
            htmlFor="cec-level"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700"
          >
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            Current Certification
          </Label>
          <Select value={certLevel} onValueChange={(val) => setCertLevel(val as CertLevel)}>
            <SelectTrigger
              id="cec-level"
              className="h-10 border-slate-300 bg-white text-sm text-slate-900"
            >
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900">
              {CERT_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value} className="text-sm">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CECs already earned */}
        <div className="space-y-2">
          <Label
            htmlFor="cec-earned"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            CECs Earned This Cycle
          </Label>
          <Input
            id="cec-earned"
            type="number"
            min={0}
            max={99}
            value={cecsEarned}
            onChange={(e) => setCecsEarned(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-10 border-slate-300 bg-white text-sm text-slate-900"
          />
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          className="mt-5 rounded-lg p-4"
          style={{
            background: '#f8fafc',
            border: '1px solid rgba(15,23,42,0.08)',
          }}
        >
          {certLevel === 'none' ? (
            /* New certification path */
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: '#2490ed' }}
                  aria-hidden="true"
                />
                <p className="text-sm leading-relaxed text-slate-700">
                  IICRC certification is obtained only through IICRC-approved schools and
                  examinations; CARSI does not deliver it. CARSI courses build the underlying
                  knowledge. Once certified, the IICRC requires{' '}
                  <strong style={{ color: '#ed9d24' }}>14 CECs</strong> every four years, or every
                  two years for Master and Inspector certifications.
                </p>
              </div>
              <Button
                asChild
                variant="glow"
                size="sm"
                className="bg-[#0f5fa8] text-white hover:bg-[#0b4e88]"
              >
                <Link
                  href={`/courses?discipline=${result.discipline.code}`}
                  aria-label={`Browse CARSI courses related to ${result.discipline.name}`}
                >
                  Browse related CARSI courses
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : result.isComplete ? (
            /* Cycle complete */
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(39,174,96,0.15)' }}
                aria-hidden="true"
              >
                <Award className="h-5 w-5" style={{ color: '#27ae60' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#27ae60' }}>
                  Cycle Complete
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  You have met the {result.required} CEC requirement for your{' '}
                  {result.discipline.code} {certLevel === 'master' ? 'Master ' : ''}Technician
                  certification this cycle. Keep learning to stay ahead.
                </p>
              </div>
            </div>
          ) : (
            /* In-progress path */
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    {cecsEarned} of {result.required} CECs
                  </span>
                  <span className="text-xs font-semibold" style={{ color: '#0f5fa8' }}>
                    {result.progress}%
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ background: '#dbe7f3' }}
                  role="progressbar"
                  aria-valuenow={result.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`CEC progress: ${result.progress}% complete`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${result.progress}%`,
                      background: 'linear-gradient(90deg, #0f5fa8, #38b8ff)',
                      boxShadow: '0 0 12px rgba(15,95,168,0.25)',
                    }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: '#eef7ff' }}>
                  <p className="text-lg font-bold" style={{ color: '#0f5fa8' }}>
                    {result.remaining}
                  </p>
                  <p className="text-xs text-slate-600">CECs needed</p>
                </div>
                <div
                  className="rounded-lg p-3 text-center"
                  style={{ background: 'rgba(237,157,36,0.08)' }}
                >
                  <p className="text-lg font-bold" style={{ color: '#ed9d24' }}>
                    {result.coursesNeeded}
                  </p>
                  <p className="text-xs text-slate-600">courses approx.</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: '#f1f5f9' }}>
                  <div className="flex items-center justify-center gap-1">
                    <Clock
                      className="h-3.5 w-3.5"
                      style={{ color: '#64748b' }}
                      aria-hidden="true"
                    />
                    <p className="text-lg font-bold text-slate-900">{result.estimatedHours}h</p>
                  </div>
                  <p className="text-xs text-slate-600">est. study time</p>
                </div>
              </div>

              <Button
                asChild
                variant="glow"
                size="sm"
                className="bg-[#0f5fa8] text-white hover:bg-[#0b4e88]"
              >
                <Link
                  href={`/courses?discipline=${result.discipline.code}`}
                  aria-label={`Browse CARSI courses; CEC hours apply only to courses the IICRC has approved`}
                >
                  Browse related CARSI courses
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
