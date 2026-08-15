import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './utils';
import {
  workspaceResponseSchema,
  workspaceListResponseSchema,
  createWorkspaceRequestSchema,
} from '@/features/workspaces/schemas/workspaceSchemas';
import { WorkspaceCard } from '@/features/workspaces/components/WorkspaceCard';
import { WorkspacesPage } from '@/features/workspaces/pages/WorkspacesPage';
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

describe('WorkspaceCard Component', () => {
  it('renders workspace title, technical badge, and role', () => {
    const workspace = {
      id: 'e4b3c2a1-0000-4000-8000-000000000001',
      owner_id: '00f3d58e-ce22-4d1f-a665-bbf8266aa2a8',
      name: 'Advanced Computer Networks',
      domain_type: 'TECHNICAL',
      visibility: 'PRIVATE',
      status: 'ACTIVE',
      created_at: '2026-08-15T09:30:00Z',
      updated_at: '2026-08-15T10:15:00Z',
      user_role: 'OWNER',
    };

    renderWithProviders(<WorkspaceCard workspace={workspace} />);

    expect(screen.getByText('Advanced Computer Networks')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
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

    const newBtn = screen.getByRole('button', { name: /new workspace/i });
    await user.click(newBtn);

    expect(await screen.findByText('Create New Workspace')).toBeInTheDocument();
  });

  it('renders workspace grid when workspaces exist', async () => {
    vi.spyOn(workspaceApi, 'getWorkspaces').mockResolvedValue({
      total: 2,
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
        {
          id: 'b9a8c7d6-0000-4000-8000-000000000002',
          owner_id: '55a1b2c3-1111-4000-8000-000000000099',
          name: 'Microeconomics',
          domain_type: 'NON_TECHNICAL',
          visibility: 'INTERNAL',
          status: 'ACTIVE',
          created_at: '2026-08-14T14:20:00Z',
          updated_at: '2026-08-15T08:00:00Z',
          user_role: 'EDITOR',
        },
      ],
    });

    renderWithProviders(<WorkspacesPage />);

    expect(await screen.findByText('Distributed Systems')).toBeInTheDocument();
    expect(screen.getByText('Microeconomics')).toBeInTheDocument();
    expect(screen.getByText('2 Workspaces')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Non-Technical')).toBeInTheDocument();
  });
});
