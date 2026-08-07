import { useState, useEffect } from 'react';
import { apiClient } from '../services/api/client';
import { sessionService } from '../services/identity/session';
import { useSessionStore } from '../store/sessionStore';

export const useSessions = () => {
  const { sessions, setSessions, removeSession } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSessions = async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.getSessions(options);
      setSessions(data);
    } catch (err) {
      if (apiClient.isCancel(err) || err.name === 'CanceledError') {
        return;
      }
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (id) => {
    try {
      await sessionService.revokeSession(id);
      removeSession(id);
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchSessions({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, []);

  return { sessions, loading, error, fetchSessions, revokeSession };
};
