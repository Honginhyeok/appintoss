import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { apiFetch, setToken, clearToken } from '../utils/env';

interface User {
  id: string;
  username: string;
  name?: string;
  phone?: string;
  role: string;
  status: string;
  settlementBank?: string;
  settlementAccount?: string;
  settlementName?: string;
  roomName?: string;
  rentAmount?: number;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface LoginParams {
  role: 'LANDLORD' | 'TENANT';
  username?: string;
  password?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (params: LoginParams) => {
    try {
      const body: Record<string, string> = { role: params.role };
      if (params.role === 'LANDLORD') {
        body.username = params.username || '';
        body.password = params.password || '';
      } else {
        body.phone = params.phone || '';
      }

      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // 토큰을 localStorage에 저장 (쿠키 실패 대비)
        if (data.token) {
          setToken(data.token);
        }
        await refreshUser();
        return { success: true };
      } else {
        return { success: false, error: data.error || '로그인에 실패했습니다.' };
      }
    } catch {
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
