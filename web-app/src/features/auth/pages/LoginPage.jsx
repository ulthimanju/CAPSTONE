import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { FileText, Lightbulb, Share, Shield, CircleNotch } from '@/components/ui/icons';
import { useAuthStatus, AUTH_STATUS } from '../hooks/useAuth';
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

function SynapseDocBadge({ className = 'h-11 w-11' }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl border border-sep-line bg-sand text-accent shadow-xs ${className}`}
      aria-hidden="true"
    >
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" ry="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </svg>
    </div>
  );
}

export function LoginPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { status } = useAuthStatus();
  const location = useLocation();

  // If initial profile verification is in flight, show quiet loading indicator
  if (status === AUTH_STATUS.UNKNOWN) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-bg font-body text-text">
        <div className="flex items-center gap-2 font-mono text-xs text-text/60">
          <CircleNotch className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
          <span>Verifying existing session...</span>
        </div>
      </div>
    );
  }

  // If already confirmed authenticated, redirect to destination
  if (status === AUTH_STATUS.AUTHENTICATED) {
    const destination = location.state?.from?.pathname || ROUTES.WORKSPACES;
    return <Navigate to={destination} replace />;
  }

  const handleGoogleLogin = () => {
    setIsRedirecting(true);
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between bg-bg font-body text-text p-6 sm:p-10 lg:p-14 overflow-hidden selection:bg-accent/20">
      {/* Bottom-left subtle decorative dot pattern */}
      <div
        className="pointer-events-none absolute -bottom-4 -left-4 h-64 w-64 opacity-25 [mask-image:radial-gradient(circle_at_bottom_left,black_20%,transparent_75%)]"
        style={{
          backgroundImage: 'radial-gradient(circle, #7A6F5D 1.75px, transparent 1.75px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden="true"
      />

      {/* Top Header: Brand & Tagline */}
      <header className="relative z-10 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text">
            SYNAPSE
          </h1>
          <p className="font-mono text-[10px] sm:text-xs tracking-widest text-text/60 uppercase mt-0.5">
            UNDERSTAND. CONNECT. REMEMBER.
          </p>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <main className="relative z-10 my-auto grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16 py-8">
        {/* Left Hero & Feature Highlights Column */}
        <div className="flex flex-col space-y-7 lg:col-span-7 xl:col-span-7 max-w-xl">
          {/* Main Headline */}
          <div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-text leading-[1.12]">
              Your documents,<br />
              <span className="italic font-serif font-normal text-accent">intelligently</span> summarized.
            </h2>

            {/* Amber accent underline indicator */}
            <div className="mt-4 h-1 w-14 rounded-full bg-accent" aria-hidden="true" />
          </div>

          {/* 4 Feature Items */}
          <div className="flex flex-col space-y-4 pt-1">
            {/* Feature 1: Smart Summaries */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sep-line bg-sand text-accent shadow-xs">
                <FileText className="h-5 w-5" />
              </div>
              <div className="pt-0.5">
                <h3 className="font-body text-sm sm:text-base font-semibold text-text">
                  Smart Summaries
                </h3>
                <p className="font-body text-xs sm:text-sm text-text/65">
                  Extract key points and core concepts instantly.
                </p>
              </div>
            </div>

            {/* Feature 2: Deep Insights */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sep-line bg-sand text-accent shadow-xs">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="pt-0.5">
                <h3 className="font-body text-sm sm:text-base font-semibold text-text">
                  Deep Insights
                </h3>
                <p className="font-body text-xs sm:text-sm text-text/65">
                  Understand the context, connections, and implications.
                </p>
              </div>
            </div>

            {/* Feature 3: Organized Knowledge */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sep-line bg-sand text-accent shadow-xs">
                <Share className="h-5 w-5" />
              </div>
              <div className="pt-0.5">
                <h3 className="font-body text-sm sm:text-base font-semibold text-text">
                  Organized Knowledge
                </h3>
                <p className="font-body text-xs sm:text-sm text-text/65">
                  Structure information for better recall and learning.
                </p>
              </div>
            </div>

            {/* Feature 4: Secure & Private */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sep-line bg-sand text-accent shadow-xs">
                <Shield className="h-5 w-5" />
              </div>
              <div className="pt-0.5">
                <h3 className="font-body text-sm sm:text-base font-semibold text-text">
                  Secure &amp; Private
                </h3>
                <p className="font-body text-xs sm:text-sm text-text/65">
                  Your documents and data are always protected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="flex justify-center lg:col-span-5 xl:col-span-5 lg:justify-end">
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-sep-line bg-surface-raised p-8 sm:p-12 text-center">
            {/* Top Centered Doc Icon */}
            <div className="mb-6 flex justify-center">
              <SynapseDocBadge className="h-12 w-12 sm:h-14 sm:w-14" />
            </div>

            {/* Card Heading */}
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Welcome to Synapse
            </h2>
            <p className="mt-2 font-body text-xs sm:text-sm text-text/65">
              Sign in to continue to your workspace
            </p>

            {/* Google Action Button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isRedirecting}
                className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-[#E08850] to-[#C1622D] hover:from-[#E89860] hover:to-[#C96C35] px-6 py-3.5 font-body text-sm sm:text-base font-medium text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-75 disabled:pointer-events-none"
                aria-label="Continue with Google"
              >
                {isRedirecting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting to Google...
                  </span>
                ) : (
                  <>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-0.5">
                      <GoogleIcon className="h-4 w-4" />
                    </div>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer spacer */}
      <footer className="relative z-10 h-2" aria-hidden="true" />
    </div>
  );
}

export default LoginPage;
