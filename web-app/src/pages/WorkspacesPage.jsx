import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';

import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';

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


  useEffect(() => {
    fetchWorkspaces();
  }, []);

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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <Typography variant="h4" style={{ fontWeight: '700', color: '#f4f4f5' }}>
            Workspaces
          </Typography>
          <Typography variant="body2" style={{ color: '#a1a1aa', marginTop: '0.25rem' }}>
            Manage and organize your collaborative environments
          </Typography>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary">
          + Create Workspace
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', backgroundColor: '#2d1517', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5' }}>
          {error}
        </div>
      ) : workspaces.length === 0 ? (
        <Card style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#16161a', border: '1px dashed #2a2a2e' }}>
          <Typography variant="h6" style={{ color: '#f4f4f5', marginBottom: '0.5rem' }}>
            No Workspaces Found
          </Typography>
          <Typography variant="body2" style={{ color: '#a1a1aa', marginBottom: '1.5rem' }}>
            Get started by creating your first collaborative workspace.
          </Typography>
          <Button onClick={() => setIsModalOpen(true)} variant="primary">
            Create Workspace
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {workspaces.map((ws) => (
            <Card key={ws.id} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#16161a', border: '1px solid #2a2a2e' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <Typography variant="h6" style={{ fontWeight: '600', color: '#f4f4f5' }}>
                    {ws.name}
                  </Typography>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: ws.visibility === 'PRIVATE' ? '#1e1b4b' : '#064e3b',
                    color: ws.visibility === 'PRIVATE' ? '#818cf8' : '#34d399',
                  }}>
                    {ws.visibility}
                  </span>
                </div>
                <Typography variant="body2" style={{ color: '#a1a1aa', marginBottom: '1rem', minHeight: '2.5rem' }}>
                  {ws.description || 'No description provided.'}
                </Typography>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #2a2a2e' }}>
                <span style={{ fontSize: '0.85rem', color: '#71717a' }}>
                  Role: <strong style={{ color: '#d4d4d8' }}>{ws.user_role || 'MEMBER'}</strong>
                </span>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/workspaces/${ws.id}`)}>
                  Open →
                </Button>

              </div>
            </Card>
          ))}
        </div>
      )}


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

    </div>
  );
};
