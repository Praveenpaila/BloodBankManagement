import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

export const AuthContext = createContext(null);

const dashboardFor = (role) => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'hospital') return '/hospital/dashboard';
  return '/donor/dashboard';
};

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

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    toast.success('Logged in successfully');
    return data.user.role;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    toast.success('Account created');
    return data.user.role;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updates) => {
    setUser((current) => ({ ...current, ...updates }));
  };

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
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
