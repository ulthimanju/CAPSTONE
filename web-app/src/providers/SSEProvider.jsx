import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../lib/tokenStorage';

const SSEContext = createContext({
  connected: false,
  lastEvent: null,
  subscribe: () => () => {},
  registerRefreshHandler: () => () => {},
  invalidateDomain: () => {},
});

const ROUTE_MAP = {
  'workspace.document.updated': 'documents',
  'workspace.document.created': 'documents',
  'workspace.document.deleted': 'documents',
  'workspace.summary.updated': 'summary',
  'workspace.learning_path.updated': 'learning_path',
  'workspace.updated': 'workspace',
  'workspace.member.updated': 'workspace',
  'workspace.activity.recorded': 'activity',
};

export function SSEProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const listenersRef = useRef(new Set());
  const refreshRegistryRef = useRef(new Map()); // Map<key: "domain:workspaceId", Set<refreshFn>>

  // Invalidate domain & execute registered refresh handlers
  const invalidateDomain = (domain, workspaceId) => {
    const targetKeys = [
      `${domain}:${workspaceId}`,
      `${domain}:global`,
    ];

    targetKeys.forEach((key) => {
      const handlers = refreshRegistryRef.current.get(key);
      if (handlers) {
        handlers.forEach((fn) => {
          try {
            fn(workspaceId);
          } catch (err) {
            console.error(`Error executing refresh handler for ${key}:`, err);
          }
        });
      }
    });
  };

  const dispatchEventToSubscribers = (payload) => {
    setLastEvent(payload);

    // Notify raw listeners
    listenersRef.current.forEach((fn) => fn(payload));

    // Route event through Central Domain Router & trigger store invalidation
    const evtName = payload.eventType || payload.event;
    const domain = ROUTE_MAP[evtName];
    if (domain) {
      invalidateDomain(domain, payload.workspace_id);
    }
  };

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setConnected(false);
      return;
    }

    let isAborted = false;
    let retryDelay = 1000;
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
                dispatchEventToSubscribers(payload);
              } catch (err) {
                // ignore parse error
              }
            }
          }
        }

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

  const registerRefreshHandler = (domain, workspaceId, refreshFn) => {
    const key = `${domain}:${workspaceId || 'global'}`;
    if (!refreshRegistryRef.current.has(key)) {
      refreshRegistryRef.current.set(key, new Set());
    }
    const set = refreshRegistryRef.current.get(key);
    set.add(refreshFn);

    return () => {
      set.delete(refreshFn);
      if (set.size === 0) {
        refreshRegistryRef.current.delete(key);
      }
    };
  };

  return (
    <SSEContext.Provider
      value={{
        connected,
        lastEvent,
        subscribe,
        registerRefreshHandler,
        invalidateDomain,
      }}
    >
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  return useContext(SSEContext);
}
