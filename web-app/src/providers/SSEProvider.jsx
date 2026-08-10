import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../lib/tokenStorage';

const SSEContext = createContext({
  connected: false,
  lastEvent: null,
  subscribe: () => () => {},
  registerRefreshHandler: () => () => {},
  invalidateDomain: () => {},
});

const SUPPORTED_EVENT_VERSIONS = new Set([1]);

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

const COALESCE_WINDOWS = {
  notifications: 50,    // Latency-sensitive (instant UI response)
  documents: 100,        // High priority
  summary: 150,          // Standard
  learning_path: 150,    // Standard
  workspace: 150,        // Standard
  activity: 300,         // Low priority (background feed)
};

const DEFAULT_COALESCE_WINDOW_MS = 150;

export function SSEProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const listenersRef = useRef(new Set());
  const refreshRegistryRef = useRef(new Map()); // Map<key: "domain:workspaceId", Set<HandlerEntry>>
  const coalescingBufferRef = useRef(new Map()); // Map<domain, Map<workspaceId, workspaceId>>
  const domainTimersRef = useRef(new Map()); // Map<domain, timerId>

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

  // Flush buffered events for a specific domain based on its window timer
  const flushDomainEvents = (domain) => {
    domainTimersRef.current.delete(domain);
    const domainBuffer = coalescingBufferRef.current.get(domain);
    if (!domainBuffer) return;

    const workspaceIds = Array.from(domainBuffer.values());
    coalescingBufferRef.current.delete(domain);

    workspaceIds.forEach((wsId) => {
      invalidateDomain(domain, wsId);
    });
  };

  const dispatchEventToSubscribers = (payload) => {
    // Validate SSE schema version
    const version = payload.version || 1;
    if (!SUPPORTED_EVENT_VERSIONS.has(version)) {
      console.warn(`[SSEProvider] Unsupported event schema version v${version}. Gracefully ignoring:`, payload);
      return;
    }

    setLastEvent(payload);

    // Notify raw listeners
    listenersRef.current.forEach((fn) => fn(payload));

    // Per-Domain Event Coalescing
    const evtName = payload.eventType || payload.event;
    const domain = ROUTE_MAP[evtName];
    if (domain) {
      const wsId = payload.workspace_id || 'global';
      
      if (!coalescingBufferRef.current.has(domain)) {
        coalescingBufferRef.current.set(domain, new Map());
      }
      coalescingBufferRef.current.get(domain).set(wsId, wsId);

      if (!domainTimersRef.current.has(domain)) {
        const windowMs = COALESCE_WINDOWS[domain] ?? DEFAULT_COALESCE_WINDOW_MS;
        const timerId = setTimeout(() => flushDomainEvents(domain), windowMs);
        domainTimersRef.current.set(domain, timerId);
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
        const response = await fetch('/api/v1/notifications/stream', {
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
      domainTimersRef.current.forEach((t) => clearTimeout(t));
      domainTimersRef.current.clear();
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
