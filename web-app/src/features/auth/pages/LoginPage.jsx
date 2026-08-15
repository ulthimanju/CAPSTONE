import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '../api/authApi';
import { ROUTES } from '@/config/constants';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  // If already authenticated, redirect to destination
  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || ROUTES.DASHBOARD;
    return <Navigate to={destination} replace />;
  }

  const handleGoogleLogin = () => {
    setIsRedirecting(true);
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4 font-body text-text">
      <main className="w-full max-w-md">
        <Card className="flex flex-col items-center text-center">
          {/* Brand Icon & Heading */}
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
            SYNAPSE
          </h1>
          <p className="mt-1 font-body text-sm text-text/80">
            Collaborative Document & AI Learning Platform
          </p>

          <div className="my-6 h-px w-full bg-sep-line" role="separator" />

          {/* Primary Google Login Button */}
          <div className="w-full space-y-4">
            <Button
              onClick={handleGoogleLogin}
              isLoading={isRedirecting}
              leftIcon={<GoogleIcon />}
              className="w-full py-2.5 text-base"
              aria-label="Continue with Google sign-in"
            >
              {isRedirecting ? 'Connecting to Google...' : 'Continue with Google'}
            </Button>

            {/* Privacy & Storage Note */}
            <div className="flex items-start gap-2.5 rounded-ui border border-sep-line bg-sand/40 p-3 text-left">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <p className="font-mono text-xs text-text/75 leading-relaxed">
                Google authorization provides seamless single sign-on and links your view-only Google Drive for document uploads.
              </p>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-center font-mono text-xs text-text/60">
          Field Journal Edition &bull; Computer Science & Engineering
        </p>
      </main>
    </div>
  );
}

export default LoginPage;
