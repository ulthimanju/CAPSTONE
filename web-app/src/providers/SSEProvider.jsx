import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../lib/tokenStorage';

const SSEContext = createContext({
  connected: false,
  lastEvent: null,
  subscribe: () => () => {},
});

export function SSEProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const listenersRef = useRef(new Set());
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnected(false);
      }
      return;
    }

    const sseUrl = `/api/v1/events/sse?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        setLastEvent(payload);
        listenersRef.current.forEach((fn) => fn(payload));
      } catch (err) {
        // ignore raw ping strings
      }
    };

    const handleEvent = (type) => (e) => {
      try {
        const payload = JSON.parse(e.data);
        payload.eventType = type;
        setLastEvent(payload);
        listenersRef.current.forEach((fn) => fn(payload));
      } catch (err) {
        // ping or parsing error
      }
    };

    es.addEventListener('connected', handleEvent('connected'));
    es.addEventListener('workspace.document.updated', handleEvent('workspace.document.updated'));
    es.addEventListener('workspace.document.created', handleEvent('workspace.document.created'));
    es.addEventListener('workspace.document.deleted', handleEvent('workspace.document.deleted'));
    es.addEventListener('workspace.summary.updated', handleEvent('workspace.summary.updated'));
    es.addEventListener('workspace.learning_path.updated', handleEvent('workspace.learning_path.updated'));
    es.addEventListener('workspace.updated', handleEvent('workspace.updated'));

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, []);

  const subscribe = (callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  };

  return (
    <SSEContext.Provider value={{ connected, lastEvent, subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  return useContext(SSEContext);
}
