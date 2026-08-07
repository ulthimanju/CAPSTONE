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

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setConnected(false);
      return;
    }

    let isAborted = false;
    let retryDelay = 1000; // Start at 1s
    const controller = new AbortController();

    const connectSSE = async () => {
      try {
        const response = await fetch('/api/v1/events/sse', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setConnected(false);
          scheduleReconnect();
          return;
        }

        // Successfully connected: reset backoff delay to 1s
        retryDelay = 1000;
        setConnected(true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!isAborted) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (!part.trim() || part.startsWith(':')) continue;

            let eventName = 'message';
            let dataStr = '';

            const lines = part.split('\n');
            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataStr += line.slice(5).trim();
              }
            }

            if (dataStr) {
              try {
                const payload = JSON.parse(dataStr);
                payload.eventType = eventName;
                setLastEvent(payload);
                listenersRef.current.forEach((fn) => fn(payload));
              } catch (err) {
                // ignore parse error
              }
            }
          }
        }
        // Stream completed cleanly
        if (!isAborted) {
          setConnected(false);
          scheduleReconnect();
        }
      } catch (err) {
        if (!isAborted) {
          setConnected(false);
          scheduleReconnect();
        }
      }
    };

    const scheduleReconnect = () => {
      if (isAborted) return;
      const currentDelay = retryDelay;
      // Exponential backoff capped at 15s
      retryDelay = Math.min(retryDelay * 2, 15000);
      setTimeout(() => {
        if (!isAborted) connectSSE();
      }, currentDelay);
    };

    connectSSE();

    return () => {
      isAborted = true;
      controller.abort();
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
