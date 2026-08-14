/**
 * AuthSection — Structural Layout Layer
 *
 * Renders the notebook plate graphic (left) and Google Sign-In panel (right)
 * exactly per auth.html specification.
 */

import React from 'react';
import './auth.css';

export function AuthSectionLayout({ onGoogleLogin, isLoading }) {
  return (
    <div className="auth-container">
      {/* ── Left Illustration Plate (Notebook SVG) ── */}
      <div className="auth-plate">
        <svg viewBox="0 0 620 680" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <rect width="620" height="680" fill="var(--bg)" />

          <g opacity="0.5">
            <path d="M -20 90 Q 200 60 320 100 T 660 70" fill="none" stroke="var(--line)" strokeWidth="0.6" />
            <path d="M -20 610 Q 220 640 340 605 T 660 630" fill="none" stroke="var(--line)" strokeWidth="0.6" />
          </g>

          <g transform="translate(310 350) rotate(-3)">
            <path d="M -220 -220 L 220 -220 L 232 220 L -208 220 Z" fill="var(--bg-surface)" stroke="var(--line)" strokeWidth="1" />
            <path d="M -3 -222 L 6 222" stroke="var(--line)" strokeWidth="1.5" />

            <g stroke="var(--line)" strokeWidth="4" strokeLinecap="round">
              <line x1="-3" y1="-206" x2="3" y2="-206" />
              <line x1="-3" y1="-176" x2="3" y2="-176" />
              <line x1="-3" y1="-146" x2="3" y2="-146" />
              <line x1="-3" y1="-116" x2="3" y2="-116" />
              <line x1="-3" y1="-86" x2="3" y2="-86" />
              <line x1="-3" y1="-56" x2="3" y2="-56" />
              <line x1="-3" y1="-26" x2="3" y2="-26" />
              <line x1="-3" y1="4" x2="3" y2="4" />
              <line x1="-3" y1="34" x2="3" y2="34" />
              <line x1="-3" y1="64" x2="3" y2="64" />
              <line x1="-3" y1="94" x2="3" y2="94" />
              <line x1="-3" y1="124" x2="3" y2="124" />
              <line x1="-3" y1="154" x2="3" y2="154" />
              <line x1="-3" y1="184" x2="3" y2="184" />
            </g>

            <g stroke="var(--line-soft)" strokeWidth="0.5" opacity="0.75">
              <line x1="-196" y1="-180" x2="-16" y2="-180" />
              <line x1="-196" y1="-152" x2="-16" y2="-152" />
              <line x1="-196" y1="-124" x2="-16" y2="-124" />
              <line x1="-196" y1="-96" x2="-16" y2="-96" />
              <line x1="-196" y1="-68" x2="-16" y2="-68" />
              <line x1="-196" y1="-40" x2="-16" y2="-40" />
              <line x1="-196" y1="-12" x2="-16" y2="-12" />
              <line x1="-196" y1="16" x2="-16" y2="16" />
              <line x1="-196" y1="44" x2="-16" y2="44" />
              <line x1="-196" y1="72" x2="-16" y2="72" />
              <line x1="-196" y1="100" x2="-16" y2="100" />
              <line x1="-196" y1="128" x2="-16" y2="128" />
              <line x1="-196" y1="156" x2="-16" y2="156" />
              <line x1="-196" y1="184" x2="-16" y2="184" />
            </g>

            <g stroke="var(--text)" strokeWidth="1.1" strokeLinecap="round" opacity="0.72" fill="none">
              <path d="M -186 -179 C -160 -181 -130 -177 -96 -180" />
              <path d="M -186 -151 C -150 -153 -104 -149 -60 -152 C -40 -153 -26 -151 -20 -152" />
              <path d="M -186 -123 C -152 -125 -108 -121 -70 -124" />
              <path d="M -186 -95 C -140 -97 -90 -93 -34 -96 C -24 -96 -18 -95 -16 -96" />
              <path d="M -186 -67 C -156 -69 -116 -65 -80 -68" />
            </g>

            <g stroke="var(--line)" strokeWidth="0.6" opacity="0.85" fill="none">
              <rect x="-186" y="4" width="170" height="118" />
              <path d="M -186 4 L -101 44 L -186 122" fill="none" />
              <path d="M -101 44 C -70 20 -40 46 -30 30 C -18 12 -46 -6 -60 12" stroke="var(--ok)" strokeWidth="1.2" fill="none" opacity="0.9" />
              <ellipse cx="-140" cy="70" rx="30" ry="20" fill="var(--ok)" opacity="0.15" stroke="none" />
            </g>
            <text x="-186" y="140" fontFamily="Georgia, serif" fontStyle="italic" fontSize="10" fill="var(--text)" opacity="0.55">fig. 3</text>

            <g stroke="var(--text)" strokeWidth="1.1" strokeLinecap="round" opacity="0.72" fill="none">
              <path d="M -186 152 C -150 154 -100 150 -50 153 C -34 154 -22 152 -18 153" />
              <path d="M -186 180 C -158 182 -110 178 -70 180" />
            </g>

            <g stroke="var(--text)" strokeWidth="1.1" strokeLinecap="round" opacity="0.72" fill="none">
              <path d="M 24 -179 C 60 -181 100 -177 150 -180" />
              <path d="M 24 -151 C 66 -153 120 -149 172 -152" />
              <path d="M 24 -123 C 54 -125 90 -121 118 -124" />
            </g>

            <g stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" fill="none">
              <path d="M 24 -85 L 210 -85" />
              <path d="M 24 -85 L 34 -91 M 24 -85 L 34 -79" />
            </g>
            <text x="30" y="-95" fontFamily="Georgia, serif" fontStyle="italic" fontSize="12" fill="var(--accent)" opacity="0.9">today</text>

            <g stroke="var(--text)" strokeWidth="1.1" strokeLinecap="round" opacity="0.72" fill="none">
              <path d="M 24 -55 C 70 -57 130 -53 190 -56" />
              <path d="M 24 -27 C 60 -29 110 -25 150 -28" />
              <path d="M 24 1 C 66 -1 120 3 175 0" />
              <path d="M 24 29 C 54 27 90 31 118 28" />
            </g>

            <g opacity="0.9">
              <ellipse cx="120" cy="80" rx="98" ry="66" fill="none" stroke="var(--ok)" strokeWidth="1" />
              <ellipse cx="120" cy="80" rx="66" ry="44" fill="none" stroke="var(--ok)" strokeWidth="0.7" opacity="0.7" />
              <ellipse cx="120" cy="80" rx="34" ry="22" fill="none" stroke="var(--ok)" strokeWidth="0.5" opacity="0.5" />
              <circle cx="120" cy="80" r="2.5" fill="var(--accent)" />
            </g>

            <g stroke="var(--text)" strokeWidth="1.1" strokeLinecap="round" opacity="0.72" fill="none">
              <path d="M 24 156 C 60 154 100 158 140 155" />
              <path d="M 24 184 C 54 182 82 186 108 183" />
            </g>

            <g opacity="0.9">
              <path d="M -18 -14 L -6 -2" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              <path d="M -6 -2 L -20 -18 L -14 -20 Z" fill="var(--accent)" />
              <path d="M -20 -18 L -24 -8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>

          <g fill="var(--text)" opacity="0.5" fontFamily="Georgia, serif" fontSize="11" fontStyle="italic">
            <text x="80" y="640">no. 14</text>
          </g>
        </svg>
      </div>

      {/* ── Right Action Panel ── */}
      <div className="auth-panel">
        <div className="auth-form-box">
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">Use your Google account to continue.</p>

          <button
            className="auth-google-btn"
            id="googleSignIn"
            type="button"
            onClick={onGoogleLogin}
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            <span>{isLoading ? 'Connecting…' : 'Continue with Google'}</span>
          </button>

          <p className="auth-footnote">
            By continuing, you agree to the<br />
            <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
