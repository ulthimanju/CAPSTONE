import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../lib/tokenStorage';

const SSEContext = createContext({
  connected: false,
  lastEvent: null,
  subscribe: () => () => {},
  subscribeToDomain: () => () => {},
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
  const domainListenersRef = useRef(new Map()); // Map<key: "domain:workspaceId", Set<fn>>

  const dispatchEventToSubscribers = (payload) => {
    setLastEvent(payload);

    // Notify raw global listeners
    listenersRef.current.forEach((fn) => fn(payload));

    // Route event through Central Domain Router
    const evtName = payload.eventType || payload.event;
    const domain = ROUTE_MAP[evtName];
    if (!domain) return;

    const wsId = payload.workspace_id;

    // Notify domain-specific subscribers for matching workspace or global domain subscribers
    const targetKeys = [
      `${domain}:${wsId}`,
      `${domain}:global`,
    ];

    targetKeys.forEach((key) => {
      const subscribers = domainListenersRef.current.get(key);
      if (subscribers) {
        subscribers.forEach((fn) => fn(payload));
      }
    });
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

  const subscribeToDomain = (domain, workspaceId, callback) => {
    const key = `${domain}:${workspaceId || 'global'}`;
    if (!domainListenersRef.current.has(key)) {
      domainListenersRef.current.set(key, new Set());
    }
    const set = domainListenersRef.current.get(key);
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        domainListenersRef.current.delete(key);
      }
    };
  };

  return (
    <SSEContext.Provider value={{ connected, lastEvent, subscribe, subscribeToDomain }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  return useContext(SSEContext);
}

// Domain-Specific Hooks
export function useDocumentEvents(workspaceId, callback) {
  const { subscribeToDomain } = useSSE();
  useEffect(() => {
    if (!callback) return;
    return subscribeToDomain('documents', workspaceId, callback);
  }, [workspaceId, callback, subscribeToDomain]);
}

export function useSummaryEvents(workspaceId, callback) {
  const { subscribeToDomain } = useSSE();
  useEffect(() => {
    if (!callback) return;
    return subscribeToDomain('summary', workspaceId, callback);
  }, [workspaceId, callback, subscribeToDomain]);
}

export function useLearningPathEvents(workspaceId, callback) {
  const { subscribeToDomain } = useSSE();
  useEffect(() => {
    if (!callback) return;
    return subscribeToDomain('learning_path', workspaceId, callback);
  }, [workspaceId, callback, subscribeToDomain]);
}

export function useWorkspaceEvents(workspaceId, callback) {
  const { subscribeToDomain } = useSSE();
  useEffect(() => {
    if (!callback) return;
    return subscribeToDomain('workspace', workspaceId, callback);
  }, [workspaceId, callback, subscribeToDomain]);
}
