import { afterEach, describe, expect, it } from 'vitest';

import { isCcwAttendanceEnabled } from './flag';

const original = process.env.CCW_ATTENDANCE_ENABLED;

afterEach(() => {
  if (original == null) delete process.env.CCW_ATTENDANCE_ENABLED;
  else process.env.CCW_ATTENDANCE_ENABLED = original;
});

describe('isCcwAttendanceEnabled fail-closed truth table', () => {
  it.each(['true', '1', ' TRUE ', ' 1 '])(
    'enables only documented value %j after normalisation',
    (value) => {
      process.env.CCW_ATTENDANCE_ENABLED = value;
      expect(isCcwAttendanceEnabled()).toBe(true);
    }
  );

  it.each([undefined, '', 'false', '0', 'yes', 'on', 'enabled', 'unknown'])(
    'keeps undocumented or disabled value %j off',
    (value) => {
      if (value == null) delete process.env.CCW_ATTENDANCE_ENABLED;
      else process.env.CCW_ATTENDANCE_ENABLED = value;
      expect(isCcwAttendanceEnabled()).toBe(false);
    }
  );
});
