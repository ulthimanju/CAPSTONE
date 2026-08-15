import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useProfileQuery } from '../hooks/useAuth';
import { oauthCallbackQuerySchema } from '../schemas/authSchemas';
import { ROUTES } from '@/config/constants';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [validationError, setValidationError] = useState(null);

  const rawToken = searchParams.get('token');
  const rawError = searchParams.get('error');

  useEffect(() => {
    if (rawError) {
      setValidationError(rawError);
      return;
    }

    const parseResult = oauthCallbackQuerySchema.safeParse({ token: rawToken });
    if (!parseResult.success) {
      setValidationError('Invalid or missing authentication token in callback URL.');
      return;
    }

    // Valid token: store in Zustand and localStorage
    setToken(parseResult.data.token);
  }, [rawToken, rawError, setToken]);

  // Hydrate user profile via TanStack Query once token is available
  const { data: profile, isLoading, isError, error } = useProfileQuery({
    enabled: !!rawToken && !validationError,
  });

  // Once profile is hydrated, navigate to dashboard
  useEffect(() => {
    if (profile) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [profile, navigate]);

  if (validationError || isError) {
    const errorMsg = validationError || error?.message || 'Authentication failed. Please try again.';

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4 font-body text-text">
        <main className="w-full max-w-md">
          <Card className="flex flex-col items-center text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-ui border border-danger/40 bg-danger-tint text-danger">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>

            <h1 className="font-display text-xl font-bold text-danger">
              Authentication Error
            </h1>
            <p className="mt-2 font-mono text-xs text-text/80 leading-relaxed">
              {errorMsg}
            </p>

            <div className="my-5 h-px w-full bg-sep-line" role="separator" />

            <Link to={ROUTES.LOGIN} className="w-full">
              <Button className="w-full">
                Return to Login
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4 font-body text-text">
      <main className="w-full max-w-md">
        <Card className="flex flex-col items-center text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
          <h1 className="mt-4 font-display text-lg font-semibold text-text">
            Signing you in...
          </h1>
          <p className="mt-1 font-mono text-xs text-text/70">
            Establishing your secure session and workspace profile
          </p>
        </Card>
      </main>
    </div>
  );
}

export default AuthCallbackPage;
