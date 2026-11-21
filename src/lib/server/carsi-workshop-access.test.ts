import { describe, expect, it } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import {
  CARSI_WORKSHOP_COURSE_SLUG,
  CARSI_WORKSHOP_PATH,
  canDownloadParticipantManual,
  canViewInstructorManual,
  certificateKindForCourseSlug,
  shouldStaffAutoEnrol,
  workshopAccessState,
} from '@/lib/server/carsi-workshop-access';

const student: SessionClaims = { sub: 'u-1', email: 'a@example.com', full_name: 'A', role: 'student' };
const instructor: SessionClaims = { ...student, role: 'instructor' };
const admin: SessionClaims = { ...student, role: 'Admin ' };

describe('CARSI workshop access', () => {
  it('uses the attendance foundation slug and a permanent CARSI path', () => {
    expect(CARSI_WORKSHOP_COURSE_SLUG).toBe('ccw-2-day-workshop');
    expect(CARSI_WORKSHOP_PATH).toBe('/workshops/carpet-cleaning');
  });

  it('signed-out visitors get nothing', () => {
    const s = workshopAccessState(null, 'active');
    expect(s).toBe('signed-out');
    expect(canDownloadParticipantManual(s)).toBe(false);
    expect(canViewInstructorManual(null)).toBe(false);
  });

  it('a signed-in learner without an access-granting enrolment is refused', () => {
    for (const status of [null, undefined, 'revoked', 'refunded', 'cancelled', 'pending']) {
      const s = workshopAccessState(student, status);
      expect(s).toBe('not-enrolled');
      expect(canDownloadParticipantManual(s)).toBe(false);
    }
  });

  it('an enrolled cohort member gets the participant manual but never the instructor manual', () => {
    for (const status of ['active', 'completed']) {
      const s = workshopAccessState(student, status);
      expect(s).toBe('enrolled');
      expect(canDownloadParticipantManual(s)).toBe(true);
    }
    expect(canViewInstructorManual(student)).toBe(false);
  });

  it('instructors and admins are staff and may open the instructor manual', () => {
    expect(workshopAccessState(instructor, null)).toBe('staff');
    expect(workshopAccessState(admin, null)).toBe('staff');
    expect(canViewInstructorManual(instructor)).toBe(true);
    expect(canViewInstructorManual(admin)).toBe(true);
  });

  it('a revoked workshop enrolment outranks the staff role (GP-737)', () => {
    for (const claims of [instructor, admin]) {
      for (const status of ['revoked', 'Refunded ', 'chargeback']) {
        const s = workshopAccessState(claims, status);
        expect(s).toBe('not-enrolled');
        expect(canDownloadParticipantManual(s)).toBe(false);
      }
      // Staff with a live row, or no row, keep staff access.
      expect(workshopAccessState(claims, 'active')).toBe('staff');
      expect(workshopAccessState(claims, null)).toBe('staff');
    }
  });

  it('instructors auto-enrol only on the allow-listed workshop; admins on any course; learners never', () => {
    expect(shouldStaffAutoEnrol(instructor, 'ccw-2-day-workshop')).toBe(true);
    expect(shouldStaffAutoEnrol(instructor, 'water-damage-restoration-fundamentals')).toBe(false);
    expect(shouldStaffAutoEnrol(instructor, null)).toBe(false);
    expect(shouldStaffAutoEnrol(admin, 'water-damage-restoration-fundamentals')).toBe(true);
    expect(shouldStaffAutoEnrol(student, 'ccw-2-day-workshop')).toBe(false);
    expect(shouldStaffAutoEnrol(null, 'ccw-2-day-workshop')).toBe(false);
  });

  it('the workshop issues a certificate of attendance; other courses keep completion', () => {
    expect(certificateKindForCourseSlug('ccw-2-day-workshop')).toBe('attendance');
    expect(certificateKindForCourseSlug('water-damage-restoration-fundamentals')).toBe('completion');
    expect(certificateKindForCourseSlug(null)).toBe('completion');
  });
});
