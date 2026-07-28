import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { tokenStore } from '../services/tokenStore';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    authService
      .refresh()
      .then(({ data }) => {
        tokenStore.set(data.accessToken);
        setUser(data.user);
      })
      .catch(clearSession)
      .finally(() => setInitializing(false));
  }, [clearSession]);

  useEffect(() => {
    window.addEventListener('auth:expired', clearSession);
    return () => window.removeEventListener('auth:expired', clearSession);
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    tokenStore.set(response.data.accessToken);
    setUser(response.data.user);
    return response;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, initializing, authenticated: Boolean(user), login, logout, clearSession }),
    [user, initializing, login, logout, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
