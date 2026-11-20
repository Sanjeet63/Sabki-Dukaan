import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, tokenStore } from '../../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const userIdRef = useRef(null);

  const applySession = useCallback(
    ({ token, user: next }) => {
      tokenStore.set(token);
      // Different account: drop cached data from the previous user
      if (userIdRef.current && userIdRef.current !== next.id) {
        queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'categories' });
      }
      userIdRef.current = next.id;
      setUser(next);
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    userIdRef.current = null;
    setUser(null);
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'categories' });
  }, [queryClient]);

  // Fetch a fresh user + token from the server (needed after a role change)
  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return null;
    try {
      const session = await api('/auth/me');
      applySession(session);
      return session.user;
    } catch {
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  }, [applySession, logout]);

  useEffect(() => {
    refresh();
    window.addEventListener('sd:unauthorized', logout);
    return () => window.removeEventListener('sd:unauthorized', logout);
  }, [refresh, logout]);

  const value = useMemo(
    () => ({ user, loading, applySession, logout, refresh, setUser }),
    [user, loading, applySession, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
