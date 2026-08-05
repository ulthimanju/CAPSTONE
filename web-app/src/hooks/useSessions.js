import { useState, useEffect } from 'react';
import { sessionService } from '../services/identity/session';
import { useSessionStore } from '../store/sessionStore';

export const useSessions = () => {
  const { sessions, setSessions, removeSession } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.getSessions();
      setSessions(data);
    } catch (err) {
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
    fetchSessions();
  }, []);

  return { sessions, loading, error, fetchSessions, revokeSession };
};
