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
import { DocumentsTab } from '@/features/workspaces/components/tabs/DocumentsTab';
import { SummaryTab } from '@/features/summary/pages/SummaryTab';
import { CollaboratorsTab } from '@/features/workspaces/components/tabs/CollaboratorsTab';
import { SettingsTab } from '@/features/workspaces/components/tabs/SettingsTab';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { workspaceApi } from '@/features/workspaces/api/workspaceApi';
import { memberApi } from '@/features/workspaces/api/memberApi';
import { documentApi } from '@/features/documents/api/documentApi';
import { summaryApi } from '@/features/summary/api/summaryApi';

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

describe('WorkspaceDetailPage & SidebarNav Navigation', () => {
  const mockWorkspace = {
    id: 'e4b3c2a1-0000-4000-8000-000000000001',
    owner_id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8',
    name: 'Operating Systems (CS301)',
    domain_type: 'TECHNICAL',
    visibility: 'INTERNAL',
    status: 'ACTIVE',
    is_summary_generated: false,
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
    useWorkspaceStore.setState({ activeWorkspaceId: 'e4b3c2a1-0000-4000-8000-000000000001' });
    vi.spyOn(workspaceApi, 'getWorkspaceById').mockResolvedValue(mockWorkspace);
    vi.spyOn(memberApi, 'getMembers').mockResolvedValue(mockMembers);
    vi.spyOn(memberApi, 'getInvitations').mockResolvedValue([]);
    vi.spyOn(documentApi, 'getWorkspaceDocuments').mockResolvedValue({ documents: [], total: 0 });
    vi.spyOn(summaryApi, 'getWorkspaceSummary').mockResolvedValue({ summary: null });
  });

  const renderAppWithSidebarAndDetail = (initialRoute = '/workspaces/e4b3c2a1-0000-4000-8000-000000000001') => {
    return renderWithProviders(
      <div className="flex">
        <aside>
          <SidebarNav />
        </aside>
        <main>
          <Routes>
            <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />}>
              <Route index element={<DocumentsTab />} />
              <Route path="documents" element={<DocumentsTab />} />
              <Route path="summary" element={<SummaryTab />} />
              <Route path="chat" element={<div>AI Tutor View</div>} />
              <Route path="collaborators" element={<CollaboratorsTab />} />
              <Route path="settings" element={<SettingsTab />} />
            </Route>
          </Routes>
        </main>
      </div>,
      { route: initialRoute }
    );
  };

  it('renders sidebar navigation links (Documents, Summary, AI Tutor, Collaborators, Settings) and default Documents view', async () => {
    renderAppWithSidebarAndDetail();

    // Verify Sidebar navigation items
    expect(screen.getByRole('link', { name: /documents/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ai tutor/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /collaborators/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();

    // Overview should no longer exist
    expect(screen.queryByRole('link', { name: /overview/i })).not.toBeInTheDocument();

    // Verify default landing view is Documents
    expect(await screen.findByText(/Workspace Documents/)).toBeInTheDocument();
  });

  it('navigates to Summary view via sidebar and shows empty state when no summary generated', async () => {
    const user = userEvent.setup();

    renderAppWithSidebarAndDetail();

    await screen.findByText(/Workspace Documents/);

    const summaryLink = screen.getByRole('link', { name: /summary/i });
    await user.click(summaryLink);

    expect(await screen.findByText(/No Workspace Summary Generated/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate summary with gemini/i })).toBeInTheDocument();
  });

  it('navigates to Collaborators view via sidebar and shows members', async () => {
    const user = userEvent.setup();

    renderAppWithSidebarAndDetail();

    await screen.findByText(/Workspace Documents/);

    const collabLink = screen.getByRole('link', { name: /collaborators/i });
    await user.click(collabLink);

    expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });

  it('submits collaborator invite form from collaborators view', async () => {
    const user = userEvent.setup();
    const inviteSpy = vi.spyOn(memberApi, 'inviteMember').mockResolvedValue({
      id: 'inv-123',
      workspace_id: 'e4b3c2a1-0000-4000-8000-000000000001',
      invited_email: 'newpeer@university.edu',
      role: 'VIEWER',
      status: 'PENDING',
    });

    renderAppWithSidebarAndDetail('/workspaces/e4b3c2a1-0000-4000-8000-000000000001/collaborators');

    const inviteBtn = await screen.findByRole('button', { name: /invite collaborator/i });
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
