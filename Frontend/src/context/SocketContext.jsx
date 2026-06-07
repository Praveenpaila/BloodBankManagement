/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from './authStore';

const SocketContext = createContext(null);

const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeSos, setActiveSos] = useState(null);
  const alarmTimer = useRef(null);
  const audioContext = useRef(null);
  const socket = useMemo(() => {
    if (!isAuthenticated || !token) return null;
    return io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }, [isAuthenticated, token]);

  const stopAlarm = () => {
    if (alarmTimer.current) {
      window.clearInterval(alarmTimer.current);
      alarmTimer.current = null;
    }
    navigator.vibrate?.(0);
  };

  const playAlarmTick = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext.current ||= new AudioContext();
      const context = audioContext.current;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.45);
    } catch {
      // Browsers can block audio until a user gesture; vibration and the modal still run.
    }
  };

  const startAlarm = () => {
    stopAlarm();
    playAlarmTick();
    navigator.vibrate?.([450, 180, 450, 500]);
    alarmTimer.current = window.setInterval(() => {
      playAlarmTick();
      navigator.vibrate?.([450, 180, 450, 500]);
    }, 1800);
  };

  const respondToSos = async (action) => {
    if (!activeSos?.data?.requestId) return;
    const requestId = activeSos.data.requestId;
    stopAlarm();
    try {
      const { data } = await api.put(`/blood-requests/${requestId}/respond`, { action });
      setActiveSos(null);
      toast.success(action === 'accept' ? 'SOS accepted. Opening chat.' : 'SOS declined.');
      if (action === 'accept') {
        navigate(`/donor/chat/${data?.data?.request?._id || requestId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Response failed');
      if (err.response?.status === 409) setActiveSos(null);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'donor') return undefined;
    if (!navigator.geolocation) return undefined;

    let cancelled = false;
    const updateDonorLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          if (cancelled) return;
          try {
            const { data } = await api.put('/donors/location', {
              lat: coords.latitude,
              lng: coords.longitude,
            });
            if (!cancelled) updateUser(data.data);
          } catch {
            // Keep the hourly location sync silent; manual screens still show errors.
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 },
      );
    };

    updateDonorLocation();
    const interval = window.setInterval(updateDonorLocation, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, user?.role, updateUser]);

  useEffect(() => {
    if (!socket) return undefined;

    socket.on('blood-request:new', (notification) => {
      if (!notification) return;
      if (user?.role === 'donor' && !notification.data?.closed) {
        setActiveSos(notification);
        startAlarm();
      }

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} alert-toast`}>
          <div className="alert-toast__pulse" />
          <div>
            <p className="alert-toast__eyebrow">Blood request nearby</p>
            <p className="alert-toast__title">{notification.title}</p>
            <p className="alert-toast__message">{notification.message}</p>
            {Number.isFinite(Number(notification.data?.distanceKm)) && (
              <p className="alert-toast__message">📍 {Number(notification.data.distanceKm).toFixed(1)} km from your location</p>
            )}
          </div>
        </div>
      ), { duration: 10000 });
    });

    socket.on('blood-request:closed', (payload = {}) => {
      setActiveSos((current) => {
        if (String(current?.data?.requestId) === String(payload.requestId)) {
          stopAlarm();
          return null;
        }
        return current;
      });
      toast.success(payload.message || 'This request was accepted by another donor.');
    });

    socket.on('blood-request:response', (notification = {}) => {
      toast.success(notification.message || 'A donor responded to your request.');
    });

    socket.on('chat:ready', ({ requestId } = {}) => {
      if (!requestId) return;
      const base = user?.role === 'hospital' ? '/hospital/chat' : '/donor/chat';
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} alert-toast`}>
          <div>
            <p className="alert-toast__eyebrow">Chat ready</p>
            <p className="alert-toast__title">Request {String(requestId).slice(-6)}</p>
            <p className="alert-toast__message">A donor accepted. You can open the request chat now.</p>
            <button
              type="button"
              className="btn-primary mt-3"
              onClick={() => {
                toast.dismiss(t.id);
                navigate(`${base}/${requestId}`);
              }}
            >
              Open Chat
            </button>
          </div>
        </div>
      ), { duration: 10000 });
      window.dispatchEvent(new CustomEvent('bloodlink:chat-ready', { detail: { requestId, base } }));
    });

    socket.on('chat:unread', ({ message } = {}) => {
      toast(message?.message || 'New chat message');
    });

    socket.on('donation:recorded', ({ pointsAwarded, totalDonations, badges, certificateId } = {}) => {
      const badgeText = badges?.length ? ` Badges: ${badges.join(', ')}.` : '';
      toast.success(
        `Donation recorded! +${pointsAwarded || 0} points. Total donations: ${totalDonations || 0}.${badgeText}${certificateId ? ` Certificate: ${certificateId}` : ''}`,
        { duration: 8000 },
      );
      window.dispatchEvent(new CustomEvent('bloodlink:donation-recorded'));
    });

    socket.on('eligibility:deferred', ({ deferralUntil } = {}) => {
      if (!deferralUntil) return;
      toast.success(`Donation completed. Eligible again after ${new Date(deferralUntil).toLocaleDateString()}.`);
      window.dispatchEvent(new CustomEvent('bloodlink:eligibility-deferred'));
    });

    return () => {
      stopAlarm();
      socket.disconnect();
    };
    // startAlarm/stopAlarm are local helpers that intentionally operate on refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user?.role]);

  const value = useMemo(() => ({ socket }), [socket]);

  return (
    <SocketContext.Provider value={value}>
      {children}
      {activeSos && (
        <div className="sos-alarm" role="dialog" aria-modal="true" aria-labelledby="sos-alarm-title">
          <div className="sos-alarm__panel">
            <div className="sos-alarm__beacon" />
            <p className="sos-alarm__eyebrow">Emergency SOS nearby</p>
            <h2 id="sos-alarm-title">{activeSos.title}</h2>
            <p>{activeSos.message}</p>
            {Number.isFinite(Number(activeSos.data?.distanceKm)) && (
              <p className="font-bold">📍 {Number(activeSos.data.distanceKm).toFixed(1)} km from your location</p>
            )}
            <div className="sos-alarm__meta">
              <span>{activeSos.data?.bloodGroup}</span>
              <span>{activeSos.data?.distance || 'Distance pending'}</span>
              <span>{activeSos.data?.duration || 'ETA pending'}</span>
            </div>
            <div className="sos-alarm__actions">
              <button type="button" className="sos-alarm__accept" onClick={() => respondToSos('accept')}>Accept</button>
              <button type="button" className="sos-alarm__decline" onClick={() => respondToSos('decline')}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
