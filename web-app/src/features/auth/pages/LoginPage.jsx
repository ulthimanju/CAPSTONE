import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Card, Button, BookLinearIcon } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '../api/authApi';
import { ROUTES } from '@/config/constants';
import appDemoVideo from '@/assets/app_demo.mp4';

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
    <div className="flex h-screen max-h-screen w-full flex-col lg:flex-row overflow-hidden bg-bg font-body text-text">
      {/* Left Column: Exactly fits window height with proper padding and non-interactive looping video */}
      <section className="flex flex-1 h-1/2 lg:h-full items-center justify-center border-b border-sep-line bg-surface p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-8 overflow-hidden select-none">
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          <video
            src={appDemoVideo}
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            className="max-h-full max-w-full h-auto w-auto object-contain rounded-ui pointer-events-none select-none shadow-card border border-sep-line/60"
          >
            <source src="/assets/app_demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </section>

      {/* Right Column: Exactly fits window height with clean vertical layout */}
      <aside className="flex h-1/2 lg:h-full w-full lg:w-[420px] xl:w-[460px] shrink-0 flex-col justify-between p-6 sm:p-8 lg:p-10 overflow-y-auto bg-bg">
        <div className="hidden lg:block">
          {/* Top spacer */}
        </div>

        <main className="mx-auto w-full max-w-sm my-auto">
          <Card className="flex flex-col items-center text-center p-6 sm:p-8">
            {/* Brand Icon & Heading */}
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent shadow-2xs">
              <BookLinearIcon className="h-6 w-6" aria-hidden="true" />
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
              SYNAPSE
            </h1>
            <p className="mt-1 font-body text-xs sm:text-sm text-text/80">
              Collaborative Document & AI Learning Platform
            </p>

            <div className="my-6 h-px w-full bg-sep-line" role="separator" />

            {/* Primary Google Login Button */}
            <div className="w-full space-y-4">
              <Button
                onClick={handleGoogleLogin}
                isLoading={isRedirecting}
                leftIcon={<GoogleIcon />}
                className="w-full py-2.5 text-sm sm:text-base font-medium shadow-2xs"
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

          <p className="mt-4 text-center font-mono text-xs text-text/60">
            Field Journal Edition &bull; Computer Science & Engineering
          </p>
        </main>

        <div className="hidden lg:block text-center font-mono text-[11px] text-text/40">
          <span>Academic Collaborative Study Environment</span>
        </div>
      </aside>
    </div>
  );
}

export default LoginPage;
