import { useEffect } from 'react';
import { apiClient } from '../services/api/client';
import { SessionManager } from '../services/identity/sessionManager';

export const useInitializeAuth = () => {
  useEffect(() => {
    // Avoid double initialization race condition on the OAuth callback page
    if (window.location.pathname.startsWith('/auth/callback')) {
      return;
    }

    const controller = new AbortController();

    SessionManager.initialize({ signal: controller.signal }).catch((error) => {
      // Handled inside SessionManager
    });

    return () => {
      controller.abort();
    };
  }, []);
};

