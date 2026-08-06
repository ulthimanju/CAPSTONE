import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await axios.get('/api/v1/workspaces', { headers });
      setWorkspaces(res.data.workspaces || []);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setError('Unable to load workspaces. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await axios.get('/api/v1/invitations/pending', { headers });
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
      await axios.post(`/api/v1/invitations/${invitationId}/accept`, {}, { headers });
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
      await axios.post(`/api/v1/invitations/${invitationId}/reject`, {}, { headers });
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
      await axios.post(
        '/api/v1/workspaces',
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
          <div className="topbar-title" style={{ fontSize: '14px', fontWeight: 600 }}>Workspaces</div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <i className="ti ti-plus"></i>Create Workspace
          </button>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div style={{ padding: '1rem', background: 'var(--bg-1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '6px' }}>
            {error}
          </div>
        ) : (
          <div>
            {/* Pending Invitations Quick Alert */}
            {pendingInvitations.length > 0 && (
              <div
                style={{
                  marginBottom: '24px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--accent)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="ti ti-mail-forward" style={{ color: 'var(--accent)', fontSize: '20px' }}></i>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                      You have {pendingInvitations.length} pending workspace invitation{pendingInvitations.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                      Review and accept invitations on your dedicated Invitations page.
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/invitations')}
                  style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
                >
                  View Invitations <i className="ti ti-arrow-right"></i>
                </button>
              </div>
            )}

            <div className="section-label" style={{ marginBottom: '12px' }}><i className="ti ti-folders"></i>Your Workspaces ({workspaces.length})</div>
            <div className="doc-list">
              {workspaces.map((ws) => (
                <div className="doc-row" key={ws.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/workspaces/${ws.id}`)}>
                  <i className="ti ti-folder" style={{ color: 'var(--accent)' }}></i>
                  <span className="doc-name" style={{ fontWeight: 500 }}>{ws.name}</span>
                  <span className="doc-meta">{ws.description || 'No description'}</span>
                  <span className="doc-status"><i className="ti ti-shield"></i>{ws.visibility}</span>
                  <button className="btn" style={{ marginLeft: '12px' }}>Open →</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Create Workspace Modal */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent size="md" className="bg-[var(--color-bg-surface,#16161a)] border border-[var(--color-border,#2a2a2e)] text-white shadow-2xl">
          <ModalHeader
            title="Create New Workspace"
            description="Set up a collaborative workspace for your documents and AI interactions."
          />
          <form onSubmit={handleCreateWorkspace}>
            <ModalBody className="space-y-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-200">
                  Workspace Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Research Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-11 px-4 rounded-lg bg-[#0c0c0e] border border-[#2a2a2e] text-white placeholder-gray-500 focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-200">
                  Description <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  placeholder="Brief summary of the workspace purpose"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-lg bg-[#0c0c0e] border border-[#2a2a2e] text-white placeholder-gray-500 focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-colors resize-none"
                />
              </div>
            </ModalBody>
            
            <ModalFooter className="gap-3 pt-4 border-t border-[#2a2a2e]">
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
