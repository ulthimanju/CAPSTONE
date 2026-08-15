import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './utils';
import {
  memberResponseSchema,
  inviteMemberRequestSchema,
} from '@/features/workspaces/schemas/memberSchemas';
import { WorkspaceDetailPage } from '@/features/workspaces/pages/WorkspaceDetailPage';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { workspaceApi } from '@/features/workspaces/api/workspaceApi';
import { memberApi } from '@/features/workspaces/api/memberApi';

describe('Member Schemas', () => {
  it('validates a member response object', () => {
    const validMember = {
      id: 'e4b3c2a1-0000-4000-8000-000000000001',
      workspace_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8',
      user_name: 'Jane Doe',
      user_email: 'jane@example.com',
      role: 'EDITOR',
      joined_at: '2026-08-15T09:30:00Z',
    };

    const res = memberResponseSchema.safeParse(validMember);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.user_name).toBe('Jane Doe');
      expect(res.data.role).toBe('EDITOR');
    }
  });

  it('validates inviteMemberRequestSchema', () => {
    const valid = { email: 'student@university.edu', role: 'VIEWER' };
    expect(inviteMemberRequestSchema.safeParse(valid).success).toBe(true);

    const invalid = { email: 'not-an-email' };
    expect(inviteMemberRequestSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('WorkspaceDetailPage Component', () => {
  const mockWorkspace = {
    id: 'e4b3c2a1-0000-4000-8000-000000000001',
    owner_id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8',
    name: 'Operating Systems (CS301)',
    domain_type: 'TECHNICAL',
    visibility: 'INTERNAL',
    status: 'ACTIVE',
    created_at: '2026-08-15T09:30:00Z',
    updated_at: '2026-08-15T10:15:00Z',
    user_role: 'OWNER',
  };

  const mockMembers = [
    {
      id: 'm-1',
      workspace_id: 'e4b3c2a1-0000-4000-8000-000000000001',
      user_id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8',
      user_name: 'Manjunatha U',
      user_email: 'umanjunath2003@gmail.com',
      role: 'OWNER',
      joined_at: '2026-08-15T09:30:00Z',
    },
    {
      id: 'm-2',
      workspace_id: 'e4b3c2a1-0000-4000-8000-000000000001',
      user_id: 'usr-collab-2',
      user_name: 'Alex Rivera',
      user_email: 'alex@example.com',
      role: 'EDITOR',
      joined_at: '2026-08-15T09:40:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: { id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8', email: 'umanjunath2003@gmail.com', name: 'Manjunatha U' },
      isAuthenticated: true,
    });
    vi.spyOn(workspaceApi, 'getWorkspaceById').mockResolvedValue(mockWorkspace);
    vi.spyOn(memberApi, 'getMembers').mockResolvedValue(mockMembers);
    vi.spyOn(memberApi, 'getInvitations').mockResolvedValue([]);
  });

  const renderDetailPage = () => {
    return renderWithProviders(
      <Routes>
        <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
      </Routes>,
      {
        route: '/workspaces/e4b3c2a1-0000-4000-8000-000000000001',
      }
    );
  };

  it('renders workspace title, technical badge, and tabs', async () => {
    renderDetailPage();

    expect(await screen.findByText('Operating Systems (CS301)')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();

    // Check tabs exist
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /documents/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /collaborators/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
  });

  it('switches to Collaborators tab and shows members', async () => {
    const user = userEvent.setup();

    renderDetailPage();

    await screen.findByText('Operating Systems (CS301)');

    const collabTab = screen.getByRole('tab', { name: /collaborators/i });
    await user.click(collabTab);

    expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });

  it('submits collaborator invite form', async () => {
    const user = userEvent.setup();
    const inviteSpy = vi.spyOn(memberApi, 'inviteMember').mockResolvedValue({
      id: 'inv-123',
      workspace_id: 'e4b3c2a1-0000-4000-8000-000000000001',
      invited_email: 'newpeer@university.edu',
      role: 'VIEWER',
      status: 'PENDING',
    });

    renderDetailPage();

    await screen.findByText('Operating Systems (CS301)');

    const inviteBtn = screen.getByRole('button', { name: /invite collaborator/i });
    await user.click(inviteBtn);

    expect(await screen.findByRole('heading', { name: /invite collaborator/i })).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'newpeer@university.edu');

    const viewerBtn = screen.getByRole('button', { name: /viewer/i });
    await user.click(viewerBtn);

    const sendBtn = screen.getByRole('button', { name: /send invitation/i });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(inviteSpy).toHaveBeenCalledWith(
        'e4b3c2a1-0000-4000-8000-000000000001',
        {
          email: 'newpeer@university.edu',
          role: 'VIEWER',
        }
      );
    });
  });
});
