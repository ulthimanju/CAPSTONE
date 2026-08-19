import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import React from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/features/auth/api/authApi';
import { userResponseSchema } from '@/features/auth/schemas/authSchemas';
import { renderWithProviders } from './utils';

describe('UI Primitives (Just-In-Time)', () => {
  it('renders primary Button with loading spinner and disabled state', () => {
    const handleClick = vi.fn();
    const { rerender } = renderWithProviders(
      <Button onClick={handleClick}>Click Me</Button>
    );

    const button = screen.getByRole('button', { name: 'Click Me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-accent');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test loading state
    rerender(<Button isLoading onClick={handleClick}>Click Me</Button>);
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Card surface component', () => {
    renderWithProviders(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toHaveClass('bg-surface-raised');
  });

  it('renders Avatar with image or initials fallback', () => {
    const { rerender } = renderWithProviders(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();

    rerender(<Avatar src="https://example.com/avatar.jpg" name="Jane Doe" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });
});

describe('Zod Schema Validation', () => {
  it('validates valid user response correctly', () => {
    const validData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'student@example.com',
      name: 'Test Student',
      picture_url: null,
      role: 'student',
      created_at: '2026-08-15T00:00:00Z',
      updated_at: '2026-08-15T00:00:00Z',
    };
    const result = userResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email in user response', () => {
    const invalidData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'not-an-email',
      name: 'Test Student',
      role: 'student',
      created_at: '2026-08-15T00:00:00Z',
      updated_at: '2026-08-15T00:00:00Z',
    };
    const result = userResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('renders brand heading and Continue with Google button', () => {
    renderWithProviders(<LoginPage />, { route: '/login' });

    expect(screen.getByRole('heading', { level: 1, name: 'SYNAPSE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });
});

describe('AuthCallbackPage Component', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('displays error card when callback has missing or invalid token', () => {
    renderWithProviders(<AuthCallbackPage />, { route: '/auth/callback' });

    expect(screen.getByRole('heading', { name: /authentication error/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to login/i })).toBeInTheDocument();
  });

  it('stores token and initiates profile fetch on valid token parameter', async () => {
    const mockProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'student@example.com',
      name: 'Test Student',
      role: 'student',
      created_at: '2026-08-15T00:00:00Z',
      updated_at: '2026-08-15T00:00:00Z',
    };

    vi.spyOn(authApi, 'getProfile').mockResolvedValue(mockProfile);

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/workspaces" element={<div>Workspaces Screen</div>} />
      </Routes>,
      { route: '/auth/callback?token=valid-test-jwt-token' }
    );

    expect(useAuthStore.getState().token).toBe('valid-test-jwt-token');

    await waitFor(() => {
      expect(screen.getByText('Workspaces Screen')).toBeInTheDocument();
    });

    expect(authApi.getProfile).toHaveBeenCalled();
  });
});
