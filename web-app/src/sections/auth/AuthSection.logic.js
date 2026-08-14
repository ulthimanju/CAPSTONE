/**
 * AuthSection — Business Logic Layer
 *
 * Handles Google OAuth login trigger using useAuth hook.
 */

import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useAuthSection() {
  const { loginWithGoogle, isLoading, isAuthenticated } = useAuth();

  const handleGoogleLogin = useCallback(() => {
    loginWithGoogle();
  }, [loginWithGoogle]);

  return {
    handleGoogleLogin,
    isLoading,
    isAuthenticated,
  };
}
