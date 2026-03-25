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
  cecsPerCycle: Record<CertLevel, number>;
  cycleLengthYears: number;
  avgCecsPerCourse: number;
}

const DISCIPLINES: DisciplineInfo[] = [
  {
    code: 'WRT',
    name: 'Water Restoration Technology',
    description: 'Flood damage, burst pipes, storm recovery',
    cecsPerCycle: { none: 0, technician: 14, master: 21 },
    cycleLengthYears: 3,
    avgCecsPerCourse: 3,
  },
  {
    code: 'CRT',
    name: 'Carpet Repair & Reinstallation Technology',
    description: 'Flooring and soft furnishing restoration',
    cecsPerCycle: { none: 0, technician: 14, master: 21 },
    cycleLengthYears: 3,
    avgCecsPerCourse: 3,
  },
  {
    code: 'ASD',
    name: 'Applied Structural Drying',
    description: 'Advanced moisture control for structural elements',
    cecsPerCycle: { none: 0, technician: 14, master: 21 },
    cycleLengthYears: 3,
    avgCecsPerCourse: 3,
  },
  {
    code: 'AMRT',
    name: 'Applied Microbial Remediation Technology',
    description: 'Mould assessment and remediation',
    cecsPerCycle: { none: 0, technician: 14, master: 21 },
    cycleLengthYears: 3,
    avgCecsPerCourse: 3,
  },
  {
    code: 'FSRT',
    name: 'Fire & Smoke Restoration Technology',
    description: 'Post-fire cleanup and deodorisation',
    cecsPerCycle: { none: 0, technician: 14, master: 21 },
    cycleLengthYears: 3,
    avgCecsPerCourse: 3,
  },
  {
    code: 'OCT',
    name: 'Odour Control Technology',
    description: 'Identifying and neutralising odour sources',
    cecsPerCycle: { none: 0, technician: 14, master: 21 },
    cycleLengthYears: 3,
    avgCecsPerCourse: 3,
  },
  {
    code: 'CCT',
    name: 'Commercial Carpet Cleaning Technology',
    description: 'Contract cleaning in commercial environments',
    cecsPerCycle: { none: 0, technician: 14, master: 21 },
    cycleLengthYears: 3,
    avgCecsPerCourse: 2,
  },
];

const CERT_LEVELS: { value: CertLevel; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'No Current Certification',
    description: 'Starting fresh — earn your first credential',
  },
  { value: 'technician', label: 'Technician', description: '14 CECs required per 3-year cycle' },
  { value: 'master', label: 'Master Technician', description: '21 CECs required per 3-year cycle' },
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
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15"
          aria-hidden="true"
        >
          <Calculator className="h-5 w-5" className="text-primary" />
        </div>
        <div>
          <h2
            className="font-display text-lg font-semibold"
                     >
            Calculate Your CEC Needs
          </h2>
          <p className="text-xs">
            Find out how many Continuing Education Credits you need
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Discipline selector */}
        <div className="space-y-2">
          <Label
            htmlFor="cec-discipline"
            className="flex items-center gap-1.5 text-xs font-medium"
                     >
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Target Discipline
          </Label>
          <Select value={discipline} onValueChange={(val) => setDiscipline(val as Discipline)}>
            <SelectTrigger
              id="cec-discipline"
              className="h-10 border-white/10 bg-white/[0.04] text-sm"
                         >
              <SelectValue placeholder="Select discipline" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0c1224]">
              {DISCIPLINES.map((d) => (
                <SelectItem key={d.code} value={d.code} className="text-sm">
                  <span className="font-medium">{d.code}</span>
                  <span className="ml-1.5">
                    — {d.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Certification level */}
        <div className="space-y-2">
          <Label
            htmlFor="cec-level"
            className="flex items-center gap-1.5 text-xs font-medium"
                     >
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            Current Certification
          </Label>
          <Select value={certLevel} onValueChange={(val) => setCertLevel(val as CertLevel)}>
            <SelectTrigger
              id="cec-level"
              className="h-10 border-white/10 bg-white/[0.04] text-sm"
                         >
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0c1224]">
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
            className="flex items-center gap-1.5 text-xs font-medium"
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
            className="h-10 border-white/10 bg-white/[0.04] text-sm"
                     />
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          className="mt-5 rounded-lg border border-border bg-card p-4"
        >
          {certLevel === 'none' ? (
            /* New certification path */
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0"
                  className="text-primary"
                  aria-hidden="true"
                />
                <p className="text-sm leading-relaxed">
                  To earn your{' '}
                  <strong className="text-primary">{result.discipline.code}</strong>{' '}
                  certification, start with the foundational courses below. Once certified, you will
                  need <strong className="text-carsi-orange">14 CECs</strong> every 3 years as a
                  Technician, or <strong className="text-carsi-orange">21 CECs</strong> as a Master
                  Technician.
                </p>
              </div>
              <Button asChild variant="glow" size="sm">
                <Link
                  href={`/courses?discipline=${result.discipline.code}`}
                  aria-label={`Browse ${result.discipline.code} courses — ${result.discipline.name}`}
                >
                  Browse {result.discipline.code} Courses
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : result.isComplete ? (
            /* Cycle complete */
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                className="bg-green-500/15"
                aria-hidden="true"
              >
                <Award className="h-5 w-5" className="text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold" className="text-green-500">
                  Cycle Complete
                </p>
                <p className="mt-0.5 text-xs">
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
                  <span className="text-xs font-medium">
                    {cecsEarned} of {result.required} CECs
                  </span>
                  <span className="text-xs font-semibold" className="text-primary">
                    {result.progress}%
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  className="bg-secondary"
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
                      background: 'linear-gradient(90deg, #2490ed, #38b8ff)',
                    }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="rounded-lg p-3 text-center"
                  className="bg-primary/10"
                >
                  <p className="text-lg font-bold" className="text-primary">
                    {result.remaining}
                  </p>
                  <p className="text-xs">
                    CECs needed
                  </p>
                </div>
                <div
                  className="rounded-lg p-3 text-center"
                  className="bg-carsi-orange/10"
                >
                  <p className="text-lg font-bold" className="text-carsi-orange">
                    {result.coursesNeeded}
                  </p>
                  <p className="text-xs">
                    courses approx.
                  </p>
                </div>
                <div
                  className="rounded-lg p-3 text-center"
                  className="bg-secondary"
                >
                  <div className="flex items-center justify-center gap-1">
                    <Clock
                      className="h-3.5 w-3.5"
                                           aria-hidden="true"
                    />
                    <p className="text-lg font-bold">
                      {result.estimatedHours}h
                    </p>
                  </div>
                  <p className="text-xs">
                    est. study time
                  </p>
                </div>
              </div>

              <Button asChild variant="glow" size="sm">
                <Link
                  href={`/courses?discipline=${result.discipline.code}`}
                  aria-label={`Browse ${result.discipline.code} courses to earn ${result.remaining} more CECs`}
                >
                  Browse {result.discipline.code} Courses
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
