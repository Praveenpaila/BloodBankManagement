import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { AuthContext, dashboardFor } from './authStore';

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const distanceMeters = (from, to) => {
  if (!from || !to) return Number.POSITIVE_INFINITY;

  const earthRadiusMeters = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const locationWatchRef = useRef(null);
  const lastLocationSyncRef = useRef({ coords: null, at: 0 });
  const locationDeniedRef = useRef(false);

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

  const syncLiveLocation = useCallback(async ({ latitude, longitude }) => {
    if (!navigator.onLine) return;

    const nextCoords = { lat: latitude, lng: longitude };
    const previous = lastLocationSyncRef.current;
    const movedMeters = distanceMeters(previous.coords, nextCoords);
    const elapsedMs = Date.now() - previous.at;

    if (movedMeters < 25 && elapsedMs < 60000) return;

    try {
      const { data } = await api.put('/donors/location', nextCoords);
      lastLocationSyncRef.current = { coords: nextCoords, at: Date.now() };
      setUser(data.data);
    } catch {
      // Keep the UI usable; protected actions still require a valid live location.
    }
  }, []);

  useEffect(() => {
    if (!token || !user || user.role === 'admin' || !navigator.geolocation) return undefined;

    const stopWatching = () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    };

    const startWatching = () => {
      if (!navigator.onLine || locationWatchRef.current !== null) return;

      locationWatchRef.current = navigator.geolocation.watchPosition(
        ({ coords }) => syncLiveLocation(coords),
        (error) => {
          if (error.code === error.PERMISSION_DENIED && !locationDeniedRef.current) {
            locationDeniedRef.current = true;
            toast.error('Allow location permission to use nearby donor matching');
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    };

    startWatching();
    window.addEventListener('online', startWatching);
    window.addEventListener('offline', stopWatching);

    return () => {
      window.removeEventListener('online', startWatching);
      window.removeEventListener('offline', stopWatching);
      stopWatching();
    };
  }, [syncLiveLocation, token, user?._id, user?.role]);

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
