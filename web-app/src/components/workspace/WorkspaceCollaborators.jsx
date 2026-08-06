import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';

export const WorkspaceCollaborators = ({ workspace }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('VIEWER');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [members, setMembers] = useState([]);
  const [actionUserId, setActionUserId] = useState(null);

  const workspaceId = workspace?.id;

  useEffect(() => {
    if (!workspaceId) return;
    fetchMembers();
  }, [workspaceId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await axios.get(`/api/v1/workspaces/${workspaceId}/members`, { headers });
      setMembers(res.data || []);
    } catch (err) {
      console.error('Failed to load workspace members:', err);
      // Default owner view fallback
      setMembers([
        {
          id: user?.id || 'owner-1',
          user_id: user?.id || workspace?.owner_id,
          name: user?.name || user?.email?.split('@')[0] || 'Workspace Owner',
          email: user?.email || 'owner@workspace.edu',
          role: 'OWNER',
          joined_at: workspace?.created_at || new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.post(
        `/api/v1/workspaces/${workspaceId}/members`,
        {
          email: inviteEmail.trim(),
          role: selectedRole,
        },
        { headers }
      );

      setNotice({ type: 'success', text: `Invitation sent to ${inviteEmail.trim()} as ${selectedRole}!` });
      setInviteEmail('');
      fetchMembers();
    } catch (err) {
      console.error('Failed to send invitation:', err);
      const detail = err.response?.data?.detail || 'Failed to send invitation. Please verify user eligibility.';
      setNotice({ type: 'error', text: detail });
    } finally {
      setInviting(false);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!window.confirm('Are you sure you want to remove this member from the workspace?')) return;
    try {
      setActionUserId(memberUserId);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.delete(`/api/v1/workspaces/${workspaceId}/members/${memberUserId}`, { headers });
      setNotice({ type: 'success', text: 'Member removed from workspace.' });
      fetchMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
      setNotice({ type: 'error', text: 'Failed to remove member.' });
    } finally {
      setActionUserId(null);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!window.confirm('Are you sure you want to leave this workspace?')) return;
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.post(`/api/v1/workspaces/${workspaceId}/leave`, {}, { headers });
      navigate('/workspaces');
    } catch (err) {
      console.error('Failed to leave workspace:', err);
      alert('Failed to leave workspace.');
    }
  };

  const handleTransferOwnership = async (newOwnerId) => {
    if (!window.confirm('Are you sure you want to transfer workspace ownership? You will become an Admin.')) return;
    try {
      setActionUserId(newOwnerId);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.post(
        `/api/v1/workspaces/${workspaceId}/transfer-ownership`,
        { new_owner_id: newOwnerId },
        { headers }
      );
      setNotice({ type: 'success', text: 'Workspace ownership transferred.' });
      fetchMembers();
    } catch (err) {
      console.error('Failed to transfer ownership:', err);
      setNotice({ type: 'error', text: 'Failed to transfer workspace ownership.' });
    } finally {
      setActionUserId(null);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'OWNER':
        return { background: 'rgba(62, 207, 142, 0.12)', color: '#3ecf8e', border: '1px solid rgba(62, 207, 142, 0.25)' };
      case 'ADMIN':
        return { background: 'rgba(77, 124, 245, 0.12)', color: 'var(--accent)', border: '1px solid rgba(77, 124, 245, 0.25)' };
      case 'EDITOR':
        return { background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' };
      default:
        return { background: 'var(--island-2)', color: 'var(--text-faint)', border: '1px solid var(--border-soft)' };
    }
  };

  const isOwner = user?.id && workspace?.owner_id && user.id === workspace.owner_id;

  return (
    <div className="island" style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)', paddingBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(77, 124, 245, 0.1)',
              color: 'var(--accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
              Workspace Collaborators
            </h2>
            <span style={{ fontSize: '12.5px', color: 'var(--text-faint)' }}>
              Invite team members, assign access permissions, and manage workspace membership.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              background: 'var(--island-2)',
              border: '1px solid var(--border-soft)',
              borderRadius: '20px',
              padding: '5px 13px',
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--text-dim)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)' }}></span>
            {members.length} Active Member{members.length !== 1 ? 's' : ''}
          </div>

          {!isOwner && (
            <button
              className="btn"
              onClick={handleLeaveWorkspace}
              style={{ fontSize: '12.5px', padding: '6px 12px', color: 'var(--danger)', borderColor: 'var(--border-soft)' }}
            >
              Leave Workspace
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          style={{
            background: notice.type === 'success' ? 'rgba(62, 207, 142, 0.08)' : 'rgba(226, 87, 76, 0.08)',
            border: `1px solid ${notice.type === 'success' ? 'rgba(62, 207, 142, 0.3)' : 'rgba(226, 87, 76, 0.3)'}`,
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: notice.type === 'success' ? '#3ecf8e' : 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {notice.text}
        </div>
      )}

      {/* 2. Invite New Team Member Form */}
      <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: '22px' }}>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: 'var(--text)',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </span>
          Invite New Team Member
        </h3>

        <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@university.edu"
            required
            style={{
              flex: 1,
              background: 'var(--island-2)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 14px',
              fontSize: '13.5px',
              color: 'var(--text)',
              outline: 'none',
              height: '40px',
            }}
          />

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              width: '200px',
              background: 'var(--island-2)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 14px',
              fontSize: '13.5px',
              color: 'var(--text)',
              outline: 'none',
              cursor: 'pointer',
              height: '40px',
            }}
          >
            <option value="VIEWER">Viewer (Read Only)</option>
            <option value="EDITOR">Editor (Can Edit)</option>
            <option value="ADMIN">Admin (Full Access)</option>
          </select>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={inviting || !inviteEmail.trim()}
            style={{ height: '40px', padding: '0 18px', fontSize: '13.5px', gap: '7px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            {inviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {/* 3. Active Workspace Members List */}
      <div>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: 'var(--text)',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </span>
          Active Workspace Members
        </h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spinner size="md" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {members.map((member) => {
              const memberUserId = member.user_id || member.id;
              const isSelf = user?.id && memberUserId === user.id;

              return (
                <div
                  key={member.id}
                  style={{
                    background: 'var(--island-2)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Left: Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'rgba(77, 124, 245, 0.12)',
                        color: 'var(--accent)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text)' }}>
                          {member.name || member.email || 'Member'}
                        </span>
                        {isSelf && (
                          <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: '500' }}>(You)</span>
                        )}
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            letterSpacing: '0.04em',
                            ...getRoleBadgeStyle(member.role),
                          }}
                        >
                          {member.role}
                        </span>
                      </div>

                      <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', display: 'flex', gap: '10px' }}>
                        <span>Joined {new Date(member.joined_at || member.joinedAt || Date.now()).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>User ID: {String(memberUserId).slice(0, 18)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Owner Actions */}
                  {isOwner && !isSelf && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn"
                        style={{ fontSize: '11.5px', padding: '5px 10px', color: 'var(--accent)', borderColor: 'var(--border-soft)' }}
                        onClick={() => handleTransferOwnership(memberUserId)}
                        disabled={actionUserId === memberUserId}
                      >
                        Make Owner
                      </button>
                      <button
                        className="btn"
                        style={{ fontSize: '11.5px', padding: '5px 10px', color: 'var(--danger)', borderColor: 'var(--border-soft)' }}
                        onClick={() => handleRemoveMember(memberUserId)}
                        disabled={actionUserId === memberUserId}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
