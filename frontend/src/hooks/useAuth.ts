/* -------------------------------------------------------------------------- */
/*  Authentication hook (placeholder)                                         */
/* -------------------------------------------------------------------------- */

import { useState, useCallback, useMemo } from 'react';
import { AUTH_TOKEN_KEY } from '@/api/client';

/* ---- User type ---- */

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  avatar?: string;
}

/* ---- Hook return type ---- */

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/* ---- Placeholder user storage key ---- */

const USER_STORAGE_KEY = 'obs_auth_user';

/* ---- Hook implementation ---- */

/**
 * Placeholder authentication hook.
 *
 * In production this would integrate with an SSO provider (e.g. Okta, Azure AD).
 * For now it persists a mock user in localStorage alongside the auth token.
 */
export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });

  const isAuthenticated = user !== null;

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // Placeholder: simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockUser: User = {
        id: crypto.randomUUID(),
        email,
        displayName: email.split('@')[0] ?? email,
        roles: ['user'],
      };
      const mockToken = btoa(JSON.stringify({ sub: mockUser.id, email }));

      localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  return useMemo(
    () => ({ user, isAuthenticated, isLoading, login, logout }),
    [user, isAuthenticated, isLoading, login, logout],
  );
}
