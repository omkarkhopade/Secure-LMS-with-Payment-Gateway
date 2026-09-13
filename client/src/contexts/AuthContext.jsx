import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    api('/user/profile', { signal: controller.signal })
      .then((result) => setUser(result.data))
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => {
      controller.abort();
      window.removeEventListener('session-expired', expired);
    };
  }, []);
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
    <AuthContext.Provider value={{ user, setUser, loading, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
