import { describe, expect, it } from 'vitest';

import {
  buildSummary,
  escapeHtml,
  toNotificationDto,
  type NotificationRow,
} from './notifications';

const baseRow: NotificationRow = {
  id: 'n1',
  type: 'toolbox_talk',
  title: 'March Toolbox Talk: Working at Heights',
  body: 'This month covers ladder safety and fall protection.',
  linkUrl: '/dashboard/toolbox/heights',
  readAt: null,
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
};

describe('toNotificationDto', () => {
  it('maps a row to the bell snake_case DTO (unread → is_read false)', () => {
    expect(toNotificationDto(baseRow)).toEqual({
      id: 'n1',
      type: 'toolbox_talk',
      title: 'March Toolbox Talk: Working at Heights',
      body: 'This month covers ladder safety and fall protection.',
      action_url: '/dashboard/toolbox/heights',
      is_read: false,
      created_at: '2026-03-01T00:00:00.000Z',
    });
  });

  it('sets is_read true when readAt present, and action_url null when no link', () => {
    const dto = toNotificationDto({
      ...baseRow,
      linkUrl: null,
      readAt: new Date('2026-03-02T00:00:00.000Z'),
    });
    expect(dto.is_read).toBe(true);
    expect(dto.action_url).toBeNull();
  });
});

describe('buildSummary', () => {
  it('serializes rows and clamps a negative unread count to 0', () => {
    const summary = buildSummary([baseRow], -3);
    expect(summary.notifications).toHaveLength(1);
    expect(summary.notifications[0].id).toBe('n1');
    expect(summary.unread_count).toBe(0);
  });

  it('passes through a valid unread count and empty list', () => {
    const summary = buildSummary([], 5);
    expect(summary.unread_count).toBe(5);
    expect(summary.notifications).toEqual([]);
  });
});

describe('escapeHtml', () => {
  it('escapes HTML metacharacters for the optional email body', () => {
    expect(escapeHtml(`<b>a</b>&"'`)).toBe('&lt;b&gt;a&lt;/b&gt;&amp;&quot;&#39;');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Ladder safety & fall protection')).toBe(
      'Ladder safety &amp; fall protection',
    );
  });
});
