import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '../api/authApi';
import { ROUTES } from '@/config/constants';

function GoogleIcon({ className = 'h-5 w-5 shrink-0' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
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
    const destination = location.state?.from?.pathname || ROUTES.WORKSPACES;
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
