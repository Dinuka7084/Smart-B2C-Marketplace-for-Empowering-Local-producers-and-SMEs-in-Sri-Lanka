import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiError,
  apiRequest,
  type SessionUser,
} from '@/lib/api';

export type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'vendor';
  businessName?: string;
  storeSlug?: string;
  registrationNumber?: string;
  description?: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  status: 'loading' | 'ready';
  login: (input: { email: string; password: string }) => Promise<SessionUser>;
  register: (input: RegisterInput) => Promise<SessionUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    let active = true;

    apiRequest<{ user: SessionUser }>('/auth/me')
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch((error: unknown) => {
        if (active && (!(error instanceof ApiError) || error.status !== 401)) {
          console.error('Could not restore the current session', error);
        }
      })
      .finally(() => {
        if (active) setStatus('ready');
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const result = await apiRequest<{ user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await apiRequest<{ user: SessionUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
