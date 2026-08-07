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

const COALESCE_WINDOW_MS = 150; // 150ms event buffering window

export function SSEProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const listenersRef = useRef(new Set());
  const refreshRegistryRef = useRef(new Map()); // Map<key: "domain:workspaceId", Set<HandlerEntry>>
  const coalescingBufferRef = useRef(new Map()); // Map<key: "domain:workspaceId", { domain, workspaceId }>
  const coalesceTimerRef = useRef(null);

  // Invalidate domain & execute registered refresh handlers (with priority, enabled filters)
  const invalidateDomain = (domain, workspaceId) => {
    const targetKeys = [
      `${domain}:${workspaceId}`,
      `${domain}:global`,
    ];

    targetKeys.forEach((key) => {
      const handlers = refreshRegistryRef.current.get(key);
      if (handlers) {
        const sorted = Array.from(handlers)
          .filter((entry) => entry.enabled !== false)
          .sort((a, b) => (b.priority || 0) - (a.priority || 0));

        sorted.forEach((entry) => {
          if (entry.debounceMs && entry.debounceMs > 0) {
            if (entry.timerId) {
              clearTimeout(entry.timerId);
            }
            entry.timerId = setTimeout(() => {
              try {
                entry.refresh(workspaceId);
              } catch (err) {
                console.error(`Error executing debounced refresh for ${key}:`, err);
              }
            }, entry.debounceMs);
          } else {
            try {
              entry.refresh(workspaceId);
            } catch (err) {
              console.error(`Error executing refresh for ${key}:`, err);
            }
          }
        });
      }
    });
  };

  // Flush buffered coalesced events into single domain invalidations
  const flushCoalescedEvents = () => {
    coalesceTimerRef.current = null;
    const pendingEvents = Array.from(coalescingBufferRef.current.values());
    coalescingBufferRef.current.clear();

    pendingEvents.forEach(({ domain, workspaceId }) => {
      invalidateDomain(domain, workspaceId);
    });
  };

  const dispatchEventToSubscribers = (payload) => {
    setLastEvent(payload);

    // Notify raw listeners
    listenersRef.current.forEach((fn) => fn(payload));

    // Event Coalescing (Burst Protection)
    const evtName = payload.eventType || payload.event;
    const domain = ROUTE_MAP[evtName];
    if (domain) {
      const wsId = payload.workspace_id;
      const bufferKey = `${domain}:${wsId || 'global'}`;
      coalescingBufferRef.current.set(bufferKey, { domain, workspaceId: wsId });

      if (!coalesceTimerRef.current) {
        coalesceTimerRef.current = setTimeout(flushCoalescedEvents, COALESCE_WINDOW_MS);
      }
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
      if (coalesceTimerRef.current) {
        clearTimeout(coalesceTimerRef.current);
      }
      setConnected(false);
    };
  }, []);

  const subscribe = (callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  };

  const registerRefreshHandler = (domain, workspaceId, refreshFnOrConfig, options = {}) => {
    const key = `${domain}:${workspaceId || 'global'}`;
    if (!refreshRegistryRef.current.has(key)) {
      refreshRegistryRef.current.set(key, new Set());
    }

    const config = typeof refreshFnOrConfig === 'function'
      ? { refresh: refreshFnOrConfig, debounceMs: options.debounceMs ?? 200, priority: options.priority ?? 0, enabled: options.enabled ?? true }
      : { debounceMs: 200, priority: 0, enabled: true, ...refreshFnOrConfig };

    const handlerEntry = {
      ...config,
      timerId: null,
    };

    const set = refreshRegistryRef.current.get(key);
    set.add(handlerEntry);

    return () => {
      if (handlerEntry.timerId) {
        clearTimeout(handlerEntry.timerId);
      }
      set.delete(handlerEntry);
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
