import { createContext, useContext, useState, useEffect } from 'react';
import { get } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const token = localStorage.getItem('hs_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await get(API_ENDPOINTS.AUTH.PROFILE);
      setUser(res.data);
    } catch {
      localStorage.removeItem('hs_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const login = (token, userData) => {
    localStorage.setItem('hs_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('hs_token');
    setUser(null);
  };

  const refreshProfile = async () => {
    const res = await get(API_ENDPOINTS.AUTH.PROFILE);
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
