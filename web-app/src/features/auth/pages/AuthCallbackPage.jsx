import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CircleNotch, WarningCircle } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '../api/authApi';
import { useProfileQuery, AUTH_QUERY_KEYS } from '../hooks/useAuth';
import { workspaceKeys } from '@/features/workspaces/hooks/workspaceKeys';
import { workspaceApi } from '@/features/workspaces/api/workspaceApi';
import { ROUTES } from '@/config/constants';

const ALLOWED_REDIRECT_PREFIXES = ['/workspaces', '/dashboard', '/profile', '/courses', '/settings'];

function getSafeRedirectUrl(target) {
  if (!target || typeof target !== 'string') return ROUTES.WORKSPACES;
  const trimmed = target.trim();
  // Prevent protocol-relative URLs (//evil.com) and backslash traversal (/\\evil.com)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return ROUTES.WORKSPACES;
  }
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(prefix + '/') || trimmed.startsWith(prefix + '?')
  );
  return isAllowed ? trimmed : ROUTES.WORKSPACES;
}

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setToken = useAuthStore((state) => state.setToken);
  const token = useAuthStore((state) => state.token);
  const [validationError, setValidationError] = useState(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const exchangeAttemptedRef = useRef(false);

  const rawCode = searchParams.get('code');
  const rawToken = searchParams.get('token');
  const rawError = searchParams.get('error');
  const rawNext = searchParams.get('next') || searchParams.get('redirect') || sessionStorage.getItem('auth_redirect');

  useEffect(() => {
    // 1. Immediately scrub query parameters from browser URL bar & history
    if (window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (sessionStorage.getItem('auth_redirect')) {
      sessionStorage.removeItem('auth_redirect');
    }

    if (rawError) {
      setValidationError(rawError);
      return;
    }

    if (exchangeAttemptedRef.current) return;
    exchangeAttemptedRef.current = true;

    const targetDestination = getSafeRedirectUrl(rawNext);

    // 2. Single-use Authorization Exchange Code Pattern (Recommended RFC 6819)
    if (rawCode) {
      setIsExchanging(true);
      authApi
        .exchangeOAuthCode(rawCode)
        .then((data) => {
          if (data?.access_token) {
            setToken(data.access_token);
            if (data.user) {
              queryClient.setQueryData(AUTH_QUERY_KEYS.PROFILE, data.user);
            }
            // Trigger parallel prefetch of workspaces so dashboard is instant
            queryClient.prefetchQuery({
              queryKey: workspaceKeys.list({ limit: 50, offset: 0 }),
              queryFn: () => workspaceApi.getWorkspaces({ limit: 50, offset: 0 }),
            });
            navigate(targetDestination, { replace: true });
          } else {
            setValidationError('Failed to retrieve access credentials.');
          }
        })
        .catch((err) => {
          setValidationError(
            err.response?.data?.detail || 'Authentication code expired or already consumed.'
          );
        })
        .finally(() => {
          setIsExchanging(false);
        });
      return;
    }

    // 3. Fallback direct token handler (e.g. testing environments)
    if (rawToken) {
      setToken(rawToken);
      navigate(ROUTES.WORKSPACES, { replace: true });
      return;
    }

    // If neither code nor token is present and store has no token
    if (!token) {
      setValidationError('Invalid or missing authentication parameters.');
    }
  }, [rawCode, rawToken, rawError, setToken, token, navigate, queryClient]);

  // 4. Fallback profile hydration for direct token logins
  const { data: profile, isError, error } = useProfileQuery({
    enabled: Boolean(token) && !validationError,
  });

  // 5. Navigate to destination if profile resolves from background query
  useEffect(() => {
    if (profile && !validationError) {
      navigate(ROUTES.WORKSPACES, { replace: true });
    }
  }, [profile, validationError, navigate]);

  if (validationError || isError) {
    const errorMsg =
      validationError || error?.message || 'Authentication failed. Please try again.';

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4 font-body text-text">
        <main className="w-full max-w-md">
          <Card className="flex flex-col items-center text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-ui border border-danger/40 bg-danger-tint text-danger">
              <WarningCircle className="h-6 w-6" aria-hidden="true" />
            </div>

            <h1 className="font-display text-xl font-bold text-danger">
              Authentication Error
            </h1>

            <p className="mt-2 text-sm text-text/80">
              {errorMsg}
            </p>

            <Button asChild className="mt-6 w-full">
              <Link to={ROUTES.LOGIN}>Return to Login</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4 font-body text-text">
      <main className="w-full max-w-md">
        <Card className="flex flex-col items-center text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center text-accent">
            <CircleNotch className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>

          <h1 className="font-display text-xl font-bold text-text">
            Completing sign in...
          </h1>

          <p className="mt-2 font-mono text-xs text-text/60">
            {isExchanging
              ? 'Securing session handshake...'
              : 'Verifying user profile and permissions...'}
          </p>
        </Card>
      </main>
    </div>
  );
}

export default AuthCallbackPage;
