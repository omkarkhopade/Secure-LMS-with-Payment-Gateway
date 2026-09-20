import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const reloadSession = () => setSessionVersion((value) => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSessionError(null);
    api('/user/profile', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setUser(result.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.status !== 401) setSessionError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => {
      controller.abort();
      window.removeEventListener('session-expired', expired);
    };
  }, [sessionVersion]);
  async function authenticate(mode, body) {
    const result = await api(`/user/${mode}`, { method: 'POST', body });
    setUser(result.user);
    return result.user;
  }
  async function logout() {
    await api('/user/signout', { method: 'POST' });
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, sessionError, reloadSession, authenticate, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
