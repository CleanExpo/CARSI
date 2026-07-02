import { describe, expect, it } from 'vitest';

import { teamRecordsToCsv, type TeamTrainingRecords } from './team-records';

const sample: TeamTrainingRecords = {
  teamId: 't1',
  teamName: 'Acme Facilities',
  memberCount: 2,
  members: [
    {
      userId: 'u1',
      fullName: 'Alex Owner',
      email: 'alex@acme.test',
      role: 'owner',
      lastActiveAt: '2026-07-01T00:00:00.000Z',
      courseCount: 1,
      completedCourseCount: 1,
      overallCompletionPct: 100,
      courses: [
        {
          courseSlug: 'floor-care',
          courseTitle: 'Floor Care, Advanced', // comma → must be quoted
          status: 'completed',
          completedLessons: 12,
          totalLessons: 12,
          completionPct: 100,
          completedAt: '2026-06-30T00:00:00.000Z',
          certificateIssued: true,
        },
      ],
    },
    {
      userId: 'u2',
      fullName: null,
      email: 'sam@acme.test',
      role: 'member',
      lastActiveAt: null,
      courseCount: 0,
      completedCourseCount: 0,
      overallCompletionPct: 0,
      courses: [],
    },
  ],
};

describe('teamRecordsToCsv', () => {
  const csv = teamRecordsToCsv(sample);
  const lines = csv.split('\n');

  it('emits a header row', () => {
    expect(lines[0]).toContain('Team');
    expect(lines[0]).toContain('Completion %');
    expect(lines[0]).toContain('Certificate issued');
  });

  it('emits one row per member×course and quotes cells with commas', () => {
    expect(lines[1]).toContain('Acme Facilities');
    expect(lines[1]).toContain('"Floor Care, Advanced"'); // comma-containing title quoted
    expect(lines[1]).toContain('completed');
    expect(lines[1]).toContain('100');
    expect(lines[1]).toContain('yes'); // certificate issued
  });

  it('emits a placeholder row for members with no enrolments', () => {
    const samRow = lines.find((l) => l.includes('sam@acme.test'));
    expect(samRow).toBeDefined();
    expect(samRow).toContain('(no enrolments)');
  });
});
