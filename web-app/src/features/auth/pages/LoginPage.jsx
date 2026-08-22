import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { FileText, Lightbulb, Share, Shield, CircleNotch } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { useAuthStatus, AUTH_STATUS } from '../hooks/useAuth';
import { authApi } from '../api/authApi';
import { ROUTES } from '@/config/constants';
import { getSafeInternalRedirect } from '@/lib/navigation';

function GoogleIcon({ className = 'h-4 w-4 shrink-0' }) {
  return (
    <img
      src="/google-icon.svg"
      alt=""
      className={`${className} object-contain`}
      aria-hidden="true"
    />
  );
}

function SynapseDocBadge({ className = 'h-11 w-11' }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-ui border border-sep-line bg-sand text-accent shadow-xs ${className}`}
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
    const destination = getSafeInternalRedirect(location.state?.from, ROUTES.WORKSPACES);
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
          backgroundImage: 'radial-gradient(circle, var(--sep-line) 1.75px, transparent 1.75px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden="true"
      />

      {/* Top Header: Brand & Tagline */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="SYNAPSE Logo" className="h-10 w-10 object-contain shrink-0" />
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text">
              SYNAPSE
            </h1>
            <p className="font-mono text-[10px] sm:text-xs tracking-widest text-text/60 uppercase mt-0.5">
              UNDERSTAND. CONNECT. REMEMBER.
            </p>
          </div>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <main className="relative z-10 my-auto grid w-full max-w-6xl mx-auto grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-12 py-8">
        {/* Left Hero & Feature Highlights Column */}
        <div className="flex flex-col space-y-7 lg:col-span-7 max-w-xl">
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent shadow-xs">
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent shadow-xs">
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent shadow-xs">
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent shadow-xs">
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
        <div className="flex justify-center lg:col-span-5 lg:justify-center">
          <div className="w-full max-w-md rounded-ui border border-sep-line bg-surface-raised p-8 sm:p-12 text-center shadow-xs">
            {/* Top Centered Doc Icon */}
            <div className="mb-6 flex justify-center">
              <img src="/logo.svg" alt="SYNAPSE Logo" className="h-16 w-16 object-contain" />
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
              <Button
                variant="primary"
                onClick={handleGoogleLogin}
                isLoading={isRedirecting}
                leftIcon={
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white p-0.5">
                    <GoogleIcon className="h-3.5 w-3.5" />
                  </div>
                }
                className="w-full py-3 text-sm sm:text-base font-medium shadow-xs"
                aria-label="Continue with Google"
              >
                {isRedirecting ? 'Connecting to Google...' : 'Continue with Google'}
              </Button>
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
