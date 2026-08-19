import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CircleNotch, WarningCircle } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '../api/authApi';
import { useProfileQuery } from '../hooks/useAuth';
import { ROUTES } from '@/config/constants';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const token = useAuthStore((state) => state.token);
  const [validationError, setValidationError] = useState(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const exchangeAttemptedRef = useRef(false);

  const rawCode = searchParams.get('code');
  const rawToken = searchParams.get('token');
  const rawError = searchParams.get('error');

  useEffect(() => {
    // 1. Immediately scrub query parameters from browser URL bar & history
    if (window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (rawError) {
      setValidationError(rawError);
      return;
    }

    if (exchangeAttemptedRef.current) return;
    exchangeAttemptedRef.current = true;

    // 2. Single-use Authorization Exchange Code Pattern (Recommended RFC 6819)
    if (rawCode) {
      setIsExchanging(true);
      authApi
        .exchangeOAuthCode(rawCode)
        .then((data) => {
          if (data?.access_token) {
            setToken(data.access_token);
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
      return;
    }

    // If neither code nor token is present and store has no token
    if (!token) {
      setValidationError('Invalid or missing authentication parameters.');
    }
  }, [rawCode, rawToken, rawError, setToken, token]);

  // 4. Hydrate user profile via TanStack Query once token is available in store
  const { data: profile, isLoading: isProfileLoading, isError, error } = useProfileQuery({
    enabled: Boolean(token) && !validationError,
  });

  // 5. Navigate to destination on confirmed profile hydration
  useEffect(() => {
    if (profile) {
      navigate(ROUTES.WORKSPACES, { replace: true });
    }
  }, [profile, navigate]);

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
