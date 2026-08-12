import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api/client';
import { Button } from '../components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';


export const WorkspacesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [actionInvId, setActionInvId] = useState(null);

  const getHeaders = () => {
    const headers = {};
    if (user?.id) headers['X-User-ID'] = user.id;
    if (user?.email) headers['X-User-Email'] = user.email;
    return headers;
  };

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/workspaces', { headers: getHeaders() });
      const wsData = res.data?.workspaces || (Array.isArray(res.data) ? res.data : []);
      setWorkspaces(wsData);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setError('Unable to load workspaces. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const res = await apiClient.get('/invitations/pending', { headers: getHeaders() });
      setPendingInvitations(res.data || []);
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchPendingInvitations();
  }, []);

  const handleAcceptInvite = async (invitationId) => {
    try {
      setActionInvId(invitationId);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.post(`/invitations/${invitationId}/accept`, {}, { headers });
      await fetchPendingInvitations();
      await fetchWorkspaces();
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      alert('Failed to accept invitation.');
    } finally {
      setActionInvId(null);
    }
  };

  const handleRejectInvite = async (invitationId) => {
    try {
      setActionInvId(invitationId);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.post(`/invitations/${invitationId}/reject`, {}, { headers });
      await fetchPendingInvitations();
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    } finally {
      setActionInvId(null);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.post(
        '/workspaces',
        {
          name: name.trim(),
          description: description.trim() || null,
          visibility: 'PRIVATE',
        },
        { headers }
      );

      setName('');
      setDescription('');
      setIsModalOpen(false);
      await fetchWorkspaces();
    } catch (err) {
      console.error('Failed to create workspace:', err);
      alert('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-title" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>Workspaces</div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <i className="ti ti-plus"></i>Create Workspace
          </button>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger-alpha-20)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        ) : (
          <div>
            {/* Pending Invitations Quick Alert */}
            {pendingInvitations.length > 0 && (
              <div
                style={{
                  marginBottom: 'var(--space-6)',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-primary-alpha-20)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-4) var(--space-5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <i className="ti ti-mail-forward" style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-xl)' }}></i>
                  <div>
                    <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                      You have {pendingInvitations.length} pending workspace invitation{pendingInvitations.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      Review and accept invitations on your dedicated Invitations page.
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/invitations')}
                  style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1-5) var(--space-3-5)', gap: 'var(--space-1-5)' }}
                >
                  View Invitations <i className="ti ti-arrow-right"></i>
                </button>
              </div>
            )}

            <div className="section-label" style={{ marginBottom: 'var(--space-3)' }}><i className="ti ti-folders"></i>Your Workspaces ({workspaces.length})</div>
            <div className="doc-list">
              {workspaces.map((ws) => (
                <div className="doc-row" key={ws.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/workspaces/${ws.id}`)}>
                  <i className="ti ti-folder" style={{ color: 'var(--color-primary)' }}></i>
                  <span className="doc-name" style={{ fontWeight: 'var(--font-weight-medium)' }}>{ws.name}</span>
                  <span className="doc-meta">{ws.description || 'No description'}</span>
                  <span className="doc-status"><i className="ti ti-shield"></i>{ws.visibility}</span>
                  <button className="btn" style={{ marginLeft: 'var(--space-3)' }}>Open →</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent size="md" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-xl)' }}>
          <ModalHeader
            title="Create New Workspace"
            description="Set up a collaborative workspace for your documents and AI interactions."
          />
          <form onSubmit={handleCreateWorkspace}>
            <ModalBody style={{ padding: 'var(--space-4) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
                  Workspace Name <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Research Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    height: 'var(--dimension-input-md)',
                    padding: '0 var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-default)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-md)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
                  Description <span style={{ color: 'var(--color-text-disabled)', fontSize: 'var(--font-size-xs)' }}>(Optional)</span>
                </label>
                <textarea
                  placeholder="Brief summary of the workspace purpose"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-default)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-md)',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            </ModalBody>
            
            <ModalFooter style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border-subtle)' }}>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={creating || !name.trim()}>
                {creating ? 'Creating...' : 'Create Workspace'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </AppLayout>
  );
};
