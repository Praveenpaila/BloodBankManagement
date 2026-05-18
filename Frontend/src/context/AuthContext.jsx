import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:3000/api/auth';

export const AuthContext = createContext();

const cleanContactFields = (data) => ({
  ...data,
  email: data.email?.trim(),
  phoneNumber: data.phoneNumber?.trim(),
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/login', cleanContactFields(credentials));
      if (res.data.success) {
        setToken(res.data.token);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/signup', cleanContactFields(userData));
      if (res.data.success) {
        setToken(res.data.token);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Signup failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (contactData) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/sendOtp', cleanContactFields(contactData));
      return { success: res.data.success, message: res.data.message };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to send OTP' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{
      token,
      isAuthenticated,
      isLoading,
      login,
      signup,
      sendOtp,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
