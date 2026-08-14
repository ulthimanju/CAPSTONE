/**
 * AuthSection — UI Composition Layer
 *
 * Connects useAuthSection hook to AuthSectionLayout.
 */

import React from 'react';
import { useAuthSection } from './AuthSection.logic';
import { AuthSectionLayout } from './AuthSection.layout';

export function AuthSection() {
  const { handleGoogleLogin, isLoading } = useAuthSection();

  return (
    <AuthSectionLayout
      onGoogleLogin={handleGoogleLogin}
      isLoading={isLoading}
    />
  );
}
