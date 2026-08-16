import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './utils';
import {
  workspaceResponseSchema,
  workspaceListResponseSchema,
  createWorkspaceRequestSchema,
} from '@/features/workspaces/schemas/workspaceSchemas';
import { WorkspacesPage } from '@/features/workspaces/pages/WorkspacesPage';
import { WorkspaceSelector } from '@/features/workspaces/components/WorkspaceSelector';
import { CreateWorkspaceModal } from '@/features/workspaces/components/CreateWorkspaceModal';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { workspaceApi } from '@/features/workspaces/api/workspaceApi';

describe('Workspace Zod Schemas', () => {
  it('validates a valid workspace object with TECHNICAL domain type', () => {
    const validWorkspace = {
      id: 'e4b3c2a1-0000-4000-8000-000000000001',
      owner_id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8',
      name: 'Distributed Systems (CS401)',
      domain_type: 'TECHNICAL',
      visibility: 'PRIVATE',
      status: 'ACTIVE',
      created_at: '2026-08-15T09:30:00Z',
      updated_at: '2026-08-15T10:15:00Z',
      user_role: 'OWNER',
    };

    const result = workspaceResponseSchema.safeParse(validWorkspace);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Distributed Systems (CS401)');
      expect(result.data.domain_type).toBe('TECHNICAL');
      expect(result.data.user_role).toBe('OWNER');
    }
  });

  it('validates NON_TECHNICAL domain type', () => {
    const nonTechWorkspace = {
      id: 'b9a8c7d6-0000-4000-8000-000000000002',
      owner_id: '55a1b2c3-1111-4000-8000-000000000099',
      name: 'Economics & Public Policy',
      domain_type: 'NON_TECHNICAL',
      visibility: 'INTERNAL',
      status: 'ACTIVE',
      created_at: '2026-08-14T14:20:00Z',
      updated_at: '2026-08-15T08:00:00Z',
      user_role: 'EDITOR',
    };

    const result = workspaceResponseSchema.safeParse(nonTechWorkspace);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain_type).toBe('NON_TECHNICAL');
    }
  });

  it('rejects invalid domain types', () => {
    const invalidDomainWorkspace = {
      id: 'b9a8c7d6-0000-4000-8000-000000000002',
      owner_id: '55a1b2c3-1111-4000-8000-000000000099',
      name: 'Invalid Domain Workspace',
      domain_type: 'OTHER_TYPE',
      visibility: 'INTERNAL',
      status: 'ACTIVE',
      created_at: '2026-08-14T14:20:00Z',
      updated_at: '2026-08-15T08:00:00Z',
    };

    const result = workspaceResponseSchema.safeParse(invalidDomainWorkspace);
    expect(result.success).toBe(false);
  });

  it('validates createWorkspaceRequestSchema defaults and constraints', () => {
    const valid = { name: 'Compiler Design' };
    const res = createWorkspaceRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe('Compiler Design');
      expect(res.data.domain_type).toBe('TECHNICAL');
      expect(res.data.visibility).toBe('PRIVATE');
    }

    const empty = { name: '' };
    expect(createWorkspaceRequestSchema.safeParse(empty).success).toBe(false);
  });

  it('validates a workspace list response', () => {
    const listPayload = {
      total: 1,
      workspaces: [
        {
          id: 'e4b3c2a1-0000-4000-8000-000000000001',
          owner_id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8',
          name: 'Distributed Systems',
          domain_type: 'TECHNICAL',
          visibility: 'PRIVATE',
          status: 'ACTIVE',
          created_at: '2026-08-15T09:30:00Z',
          updated_at: '2026-08-15T10:15:00Z',
          user_role: 'OWNER',
        },
      ],
    };

    const result = workspaceListResponseSchema.safeParse(listPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(1);
      expect(result.data.workspaces.length).toBe(1);
    }
  });
});

describe('WorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clearActiveWorkspace();
  });

  it('sets and clears active workspace id', () => {
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();

    useWorkspaceStore.getState().setActiveWorkspaceId('ws-12345');
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-12345');

    useWorkspaceStore.getState().clearActiveWorkspace();
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
  });
});

describe('WorkspaceSelector Component in Header', () => {
  const mockWorkspaces = [
    {
      id: 'ws-1',
      owner_id: 'usr-1',
      name: 'Distributed Systems (CS401)',
      domain_type: 'TECHNICAL',
      visibility: 'PRIVATE',
      status: 'ACTIVE',
      created_at: '2026-08-15T09:30:00Z',
      updated_at: '2026-08-15T10:15:00Z',
      user_role: 'OWNER',
    },
    {
      id: 'ws-2',
      owner_id: 'usr-1',
      name: 'Economics 101',
      domain_type: 'NON_TECHNICAL',
      visibility: 'INTERNAL',
      status: 'ACTIVE',
      created_at: '2026-08-15T09:30:00Z',
      updated_at: '2026-08-15T10:15:00Z',
      user_role: 'EDITOR',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: { id: 'usr-1', email: 'test@example.com', name: 'Manjunatha U' },
      isAuthenticated: true,
    });
    useWorkspaceStore.setState({ activeWorkspaceId: 'ws-1' });
    vi.spyOn(workspaceApi, 'getWorkspaces').mockResolvedValue({
      total: 2,
      workspaces: mockWorkspaces,
    });
  });

  it('renders active workspace in header selector and opens dropdown with New Workspace at bottom', async () => {
    const user = userEvent.setup();

    renderWithProviders(<WorkspaceSelector />);

    expect(await screen.findByText('Distributed Systems (CS401)')).toBeInTheDocument();

    const triggerBtn = screen.getByRole('button', { name: /select workspace/i });
    await user.click(triggerBtn);

    expect(await screen.findByText('Economics 101')).toBeInTheDocument();
    expect(screen.getByText('New Workspace')).toBeInTheDocument();
  });
});

describe('CreateWorkspaceModal Component', () => {
  it('submits valid form with name, domain type, and visibility', async () => {
    const user = userEvent.setup();
    const mockCreated = {
      id: 'e4b3c2a1-0000-4000-8000-000000000001',
      owner_id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8',
      name: 'Deep Learning',
      domain_type: 'TECHNICAL',
      visibility: 'INTERNAL',
      status: 'ACTIVE',
      created_at: '2026-08-15T09:30:00Z',
      updated_at: '2026-08-15T10:15:00Z',
      user_role: 'OWNER',
    };

    const createSpy = vi.spyOn(workspaceApi, 'createWorkspace').mockResolvedValue(mockCreated);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    renderWithProviders(
      <CreateWorkspaceModal
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );

    const nameInput = screen.getByLabelText(/workspace name/i);
    await user.type(nameInput, 'Deep Learning');

    const internalBtn = screen.getByRole('button', { name: /internal/i });
    await user.click(internalBtn);

    const submitBtn = screen.getByRole('button', { name: /create workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'Deep Learning',
        domain_type: 'TECHNICAL',
        visibility: 'INTERNAL',
      });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledWith(mockCreated);
  });

  it('displays real-time name availability status below input', async () => {
    const user = userEvent.setup();
    vi.spyOn(workspaceApi, 'checkNameAvailability').mockResolvedValue({
      available: true,
      name: 'Available Workspace',
      reason: 'Name is available.',
    });

    renderWithProviders(
      <CreateWorkspaceModal
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/workspace name/i);
    await user.type(nameInput, 'Available Workspace');

    expect(await screen.findByText('Name is available.')).toBeInTheDocument();
  });
});

describe('WorkspacesPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: { id: 'usr-1', email: 'test@example.com', name: 'Manjunatha U' },
      isAuthenticated: true,
    });
  });

  it('renders empty state when no workspaces exist and opens create modal', async () => {
    const user = userEvent.setup();
    vi.spyOn(workspaceApi, 'getWorkspaces').mockResolvedValue({
      total: 0,
      workspaces: [],
    });

    renderWithProviders(<WorkspacesPage />);

    expect(await screen.findByText('No workspaces found')).toBeInTheDocument();

    const createBtn = screen.getByRole('button', { name: /create workspace/i });
    await user.click(createBtn);

    expect(await screen.findByText('Create New Workspace')).toBeInTheDocument();
  });

  it('redirects to active workspace detail view when workspaces exist', async () => {
    vi.spyOn(workspaceApi, 'getWorkspaces').mockResolvedValue({
      total: 1,
      workspaces: [
        {
          id: 'ws-100',
          owner_id: 'usr-1',
          name: 'Compiler Design',
          domain_type: 'TECHNICAL',
          visibility: 'PRIVATE',
          status: 'ACTIVE',
          created_at: '2026-08-15T09:30:00Z',
          updated_at: '2026-08-15T10:15:00Z',
          user_role: 'OWNER',
        },
      ],
    });

    renderWithProviders(
      <Routes>
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/workspaces/ws-100" element={<div>Workspace 100 View</div>} />
      </Routes>,
      { route: '/workspaces' }
    );

    expect(await screen.findByText('Workspace 100 View')).toBeInTheDocument();
  });
});
