import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { AuthContext, dashboardFor } from './authStore';

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data);
      } catch {
        localStorage.removeItem('token');
        setToken('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    toast.success('Logged in successfully');
    return data.user.role;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    toast.success('Account created');
    return data.user.role;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const updateUser = useCallback((updates) => {
    setUser((current) => ({ ...current, ...updates }));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      register,
      updateUser,
      dashboardFor,
    }),
    [user, token, loading, login, logout, register, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
