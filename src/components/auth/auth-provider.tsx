'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, type User } from '@/lib/api/auth';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    getUser();
  }, []);

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
