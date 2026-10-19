import { describe, expect, it } from 'vitest';
import { formatCecCountLabel } from './cec-display';

describe('formatCecCountLabel (GP-639)', () => {
  it('is singular for one CEC', () => {
    expect(formatCecCountLabel(1)).toBe('1 CEC');
    expect(formatCecCountLabel('1.0')).toBe('1 CEC');
  });
  it('is plural otherwise', () => {
    expect(formatCecCountLabel(2)).toBe('2 CECs');
    expect(formatCecCountLabel('1.5')).toBe('1.5 CECs');
  });
  it('is null when hours are missing or not positive', () => {
    expect(formatCecCountLabel(null)).toBeNull();
    expect(formatCecCountLabel(0)).toBeNull();
    expect(formatCecCountLabel('')).toBeNull();
  });
});
