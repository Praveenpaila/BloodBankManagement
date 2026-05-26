import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export const dashboardFor = (role) => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'hospital') return '/hospital/dashboard';
  return '/donor/dashboard';
};

export const useAuth = () => useContext(AuthContext);
