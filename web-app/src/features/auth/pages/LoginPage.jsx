import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, BookOpen, Layers, Users } from 'lucide-react';
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
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-bg font-body text-text">
      {/* Left Column: Product Showcase & App Demo Video */}
      <section className="flex flex-1 flex-col justify-between border-b border-sep-line bg-surface p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12 xl:p-16">
        {/* Top Branding Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent shadow-2xs">
              <BookLinearIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-text">SYNAPSE</span>
              <span className="ml-2 rounded-full border border-sep-line bg-sand/60 px-2 py-0.5 font-mono text-[10px] text-text/70">
                v2.0
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-text/60">
            <span>Specialization:</span>
            <span className="font-semibold text-text">CSE</span>
          </div>
        </div>

        {/* Center: Video Preview & Value Prop */}
        <div className="my-8 flex flex-col items-center justify-center space-y-6 max-w-2xl mx-auto w-full">
          <div className="w-full space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 font-mono text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI-Powered Academic Intelligence</span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl lg:text-4xl">
              Turn lecture materials into personalized masterclasses.
            </h2>
            <p className="font-body text-sm text-text/75 leading-relaxed">
              Synthesize multi-document courses, generate structured learning paths with interactive quizzes, and clarify concepts in real-time with grounded AI tutoring.
            </p>
          </div>

          {/* Video Container with Mockup Border */}
          <div className="group relative w-full overflow-hidden rounded-ui-lg border border-sep-line bg-sand/40 p-2 shadow-card backdrop-blur-xs transition-all duration-300 hover:border-accent/30">
            <div className="relative aspect-video w-full overflow-hidden rounded-ui bg-black/90 shadow-inner">
              <video
                src={appDemoVideo}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="h-full w-full object-cover"
              >
                <source src="/assets/app_demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-start gap-2.5 rounded-ui border border-sep-line bg-bg/50 p-3">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <h3 className="font-mono text-xs font-bold text-text">Multi-Doc Synthesis</h3>
                <p className="font-body text-[11px] text-text/70 mt-0.5">Parse PDFs, DOCX, & notes into unified knowledge.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-ui border border-sep-line bg-bg/50 p-3">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <h3 className="font-mono text-xs font-bold text-text">Learning Paths</h3>
                <p className="font-body text-[11px] text-text/70 mt-0.5">Custom curriculum units with interactive quizzes.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-ui border border-sep-line bg-bg/50 p-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <h3 className="font-mono text-xs font-bold text-text">Live Collaboration</h3>
                <p className="font-body text-[11px] text-text/70 mt-0.5">Shared workspaces with granular role permissions.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Bottom Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-text/50">
          <span>Field Journal Edition</span>
          <span>Computer Science & Engineering</span>
        </div>
      </section>

      {/* Right Column: Authentication Form */}
      <aside className="flex w-full flex-col justify-between p-6 sm:p-12 lg:w-[460px] xl:w-[500px] lg:p-14 bg-bg">
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
        </main>

        <div className="pt-6 text-center font-mono text-xs text-text/50">
          <span>By signing in, you agree to academic integrity and data privacy policies.</span>
        </div>
      </aside>
    </div>
  );
}

export default LoginPage;
