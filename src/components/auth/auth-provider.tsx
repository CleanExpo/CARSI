'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { authApi, type User } from '@/lib/api/auth';
import { hasSessionSentinel } from '@/lib/auth/session-sentinel';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

const subscribeToNothing = () => () => {};

/**
 * Whether the browser holds the session sentinel: null on the server and during hydration, so
 * the first client render matches the server markup, then the cookie's answer.
 */
function useSessionSentinel(): boolean | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => hasSessionSentinel(document.cookie),
    () => null
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sentinel = useSessionSentinel();
  const [user, setUser] = useState<User | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    // An anonymous visitor (no sentinel) makes no auth request at all. The session cookies
    // are httpOnly, so the sentinel is the only way the browser can know; before it, every
    // public page cost two 401s (/api/auth/me, then the client's automatic /api/auth/refresh).
    if (sentinel !== true) return;
    let cancelled = false;
    authApi.getCurrentUser().then((currentUser) => {
      if (cancelled) return;
      setUser(currentUser);
      setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [sentinel]);

  const loading = sentinel === null ? true : sentinel ? !resolved : false;

  const signOut = async () => {
    await authApi.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const currentUser = await authApi.getCurrentUser();
    setUser(currentUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
