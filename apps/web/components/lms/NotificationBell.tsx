'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotifSummary {
  notifications: Notification[];
  unread_count: number;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotifSummary | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await apiClient.get<NotifSummary>('/api/lms/notifications/me');
      setData(result);
    } catch {
      // silent fail — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markRead(id: string) {
    try {
      await apiClient.patch(`/api/lms/notifications/${id}/read`, {});
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) =>
                n.id === id ? { ...n, is_read: true } : n
              ),
              unread_count: Math.max(0, prev.unread_count - 1),
            }
          : prev
      );
    } catch {
      // silent fail
    }
  }

  async function markAllRead() {
    try {
      await apiClient.post('/api/lms/notifications/me/read-all', {});
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) => ({ ...n, is_read: true })),
              unread_count: 0,
            }
          : prev
      );
    } catch {
      // silent fail
    }
  }

  const unread = data?.unread_count ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-sm transition-colors"
        style={{
          background: open ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
            style={{ background: '#2490ed', color: '#fff' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-11 right-0 z-50 w-80 overflow-hidden rounded-sm shadow-2xl"
          style={{
            background: '#0d1626',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs transition-colors"
                style={{ color: '#2490ed' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {!data || data.notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              data.notifications.map((n) => (
                <div
                  key={n.id}
                  className="cursor-pointer px-4 py-3 transition-colors"
                  style={{
                    background: n.is_read ? 'transparent' : 'rgba(36,144,237,0.06)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onClick={() => {
                    if (!n.is_read) markRead(n.id);
                    if (n.action_url) window.location.href = n.action_url;
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-xs font-semibold"
                        style={{
                          color: n.is_read ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)',
                        }}
                      >
                        {n.title}
                      </p>
                      <p
                        className="mt-0.5 line-clamp-2 text-xs"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        {n.body}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: '#2490ed' }}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
