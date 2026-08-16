import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfileMenu } from '@/components/layout/UserProfileMenu';
import { ActiveSessionsPage } from '@/features/auth/pages/ActiveSessionsPage';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/features/auth/api/authApi';

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    getProfile: vi.fn(),
    checkGoogleDriveStatus: vi.fn().mockResolvedValue({ isLinked: true, data: {} }),
    getSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllSessions: vi.fn(),
  },
}));

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Active Sessions & Device Management', () => {
  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'alex.rivera@example.com',
    name: 'Alex Rivera',
    role: 'Student',
  };

  const mockSessions = [
    {
      id: 'session-1',
      user_id: mockUser.id,
      device: 'Windows 11 PC',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      last_activity: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: 'session-2',
      user_id: mockUser.id,
      device: 'MacBook Pro',
      ip_address: '10.0.0.15',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/605.1',
      last_activity: new Date(Date.now() - 3600000).toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: mockUser,
      token: 'mock.eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJzZXNzaW9uX2lkIjoic2Vzc2lvbi0xIn0.mock',
      isAuthenticated: true,
    });
  });

  it('renders Active Sessions item in UserProfileMenu dropdown', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserProfileMenu />);

    // Open user dropdown using userEvent
    const trigger = screen.getByRole('button', { name: /open user profile menu/i });
    await user.click(trigger);

    expect(await screen.findByText(/active sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
  });

  it('renders ActiveSessionsPage with current session and other active devices', async () => {
    authApi.getSessions.mockResolvedValueOnce(mockSessions);

    renderWithProviders(<ActiveSessionsPage />);

    expect(await screen.findByText('Active Sessions & Devices')).toBeInTheDocument();
    expect(await screen.findByText('(This Device)')).toBeInTheDocument();
    expect(screen.getByText('Current Session')).toBeInTheDocument();
    expect(screen.getByText('Other Active Devices (1)')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.15')).toBeInTheDocument();
  });

  it('triggers revoke on an active session with confirmation dialog', async () => {
    const user = userEvent.setup();
    authApi.getSessions.mockResolvedValueOnce(mockSessions);
    authApi.revokeSession.mockResolvedValueOnce({ status: 'success' });

    renderWithProviders(<ActiveSessionsPage />);

    expect(await screen.findByText('Other Active Devices (1)')).toBeInTheDocument();

    const revokeBtn = screen.getByRole('button', { name: /revoke/i });
    await user.click(revokeBtn);

    // Confirm dialog appears
    expect(await screen.findByText('Revoke Active Session?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Revoke Session' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(authApi.revokeSession).toHaveBeenCalledWith('session-2');
    });
  });

  it('triggers sign out all other sessions with confirmation dialog', async () => {
    const user = userEvent.setup();
    authApi.getSessions.mockResolvedValueOnce(mockSessions);
    authApi.revokeAllSessions.mockResolvedValueOnce({ status: 'success' });

    renderWithProviders(<ActiveSessionsPage />);

    expect(await screen.findByText('Sign Out Other Sessions')).toBeInTheDocument();

    const signOutOthersBtn = screen.getByRole('button', { name: 'Sign Out Other Sessions' });
    await user.click(signOutOthersBtn);

    expect(await screen.findByText('Sign Out All Other Sessions?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Sign Out Other Devices' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(authApi.revokeAllSessions).toHaveBeenCalled();
    });
  });
});
