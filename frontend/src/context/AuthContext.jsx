import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = authApi.getToken();
    if (!token) { setLoading(false); return; }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      authApi.clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    authApi.setTokens(data.access_token, data.refresh_token);
    const me = await authApi.me();
    setUser(me);
    return me;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) await authApi.logout(refresh);
    } catch {}
    authApi.clearTokens();
    setUser(null);
  };

  const hasPermission = (perm) => user?.permissions?.includes(perm) ?? false;
  const hasRole       = (role) => user?.role === role;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
