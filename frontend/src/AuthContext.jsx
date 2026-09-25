import { createContext, useContext, useState, useCallback } from 'react';
import { api, saveSession, clearSession, getUser } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.login({ email, password });
    saveSession(token, user);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user } = await api.register(payload);
    saveSession(token, user);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
