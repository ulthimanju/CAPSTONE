import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api/client';
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
      const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/members`, { headers });
      setMembers(res.data || []);
    } catch (err) {
      console.error('Failed to load workspace members:', err);
      setMembers([]);
      setNotice({ type: 'error', text: 'Failed to load workspace members.' });
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
      await apiClient.post(
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

  const handleUpdateRole = async (memberUserId, newRole, version = 1) => {
    const previousMembers = [...members];
    // Optimistic UI Update
    setMembers((prev) =>
      prev.map((m) => ((m.user_id || m.id) === memberUserId ? { ...m, role: newRole } : m))
    );

    try {
      setActionUserId(memberUserId);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.put(
        `/api/v1/workspaces/${workspaceId}/members/${memberUserId}`,
        { role: newRole, version },
        { headers }
      );
      setNotice({ type: 'success', text: `Updated member role to ${newRole}.` });
      fetchMembers();
    } catch (err) {
      console.error('Failed to update member role:', err);
      // Revert optimistic update on failure
      setMembers(previousMembers);
      const detail = err.response?.data?.detail || 'Failed to update member role.';
      setNotice({ type: 'error', text: detail });
    } finally {
      setActionUserId(null);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!window.confirm('Are you sure you want to remove this member from the workspace?')) return;
    const previousMembers = [...members];
    // Optimistic UI Remove
    setMembers((prev) => prev.filter((m) => (m.user_id || m.id) !== memberUserId));

    try {
      setActionUserId(memberUserId);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.delete(`/api/v1/workspaces/${workspaceId}/members/${memberUserId}`, { headers });
      setNotice({ type: 'success', text: 'Member removed from workspace.' });
      fetchMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
      // Revert optimistic update on failure
      setMembers(previousMembers);
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
      await apiClient.post(`/api/v1/workspaces/${workspaceId}/leave`, {}, { headers });
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
      await apiClient.post(
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
        return { background: 'var(--color-success-subtle)', color: 'var(--color-success-text)', border: '1px solid var(--color-success-alpha-20)' };
      case 'ADMIN':
        return { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-alpha-20)' };
      case 'EDITOR':
        return { background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)', border: '1px solid var(--color-warning-alpha-20)' };
      default:
        return { background: 'var(--color-bg-secondary)', color: 'var(--color-text-disabled)', border: '1px solid var(--color-border-subtle)' };
    }
  };

  const isOwner = Boolean(user?.id && workspace?.owner_id && user.id === workspace.owner_id);
  const currentMember = members.find((m) => (m.user_id || m.id) === user?.id);
  const userRole = isOwner ? 'OWNER' : currentMember?.role || workspace?.user_role || 'VIEWER';
  const canManageMembers = userRole === 'OWNER' || userRole === 'ADMIN';
  const canInvite = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'EDITOR';

  return (
    <div className="island" style={{ padding: 'var(--space-6-5) var(--space-7)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-4-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
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
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
              Workspace Collaborators
            </h2>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
              Invite team members, assign access permissions, and manage workspace membership.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-1) var(--space-3)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1-5)',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-primary)' }}></span>
            {members.length} Active Member{members.length !== 1 ? 's' : ''}
          </div>

          {!isOwner && (
            <button
              className="btn"
              onClick={handleLeaveWorkspace}
              style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-1-5) var(--space-3)', color: 'var(--color-danger)', borderColor: 'var(--color-border-subtle)' }}
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
            background: notice.type === 'success' ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            border: `1px solid ${notice.type === 'success' ? 'var(--color-success-alpha-20)' : 'var(--color-danger-alpha-20)'}`,
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2-5) var(--space-3-5)',
            fontSize: 'var(--font-size-md)',
            color: notice.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          {notice.text}
        </div>
      )}

      {/* 2. Invite New Team Member Form */}
      {canInvite && (
        <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-5-5)' }}>
          <h3
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-3-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span style={{ color: 'var(--color-primary)', display: 'inline-flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6M22 11h-6" />
              </svg>
            </span>
            Invite New Team Member
          </h3>

          <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: 'var(--space-2-5)', alignItems: 'center' }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@university.edu"
              required
              style={{
                flex: 1,
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-2) var(--space-3-5)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                height: 'var(--dimension-input-md)',
              }}
            />

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                width: '200px',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-2) var(--space-3-5)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                cursor: 'pointer',
                height: 'var(--dimension-input-md)',
              }}
            >
              <option value="VIEWER">Viewer (Read Only)</option>
              <option value="EDITOR">Editor (Can Edit)</option>
              {canManageMembers && <option value="ADMIN">Admin (Full Access)</option>}
            </select>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={inviting || !inviteEmail.trim()}
              style={{ height: 'var(--dimension-input-md)', padding: '0 var(--space-4-5)', fontSize: 'var(--font-size-md)', gap: 'var(--space-2)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      )}

      {/* 3. Active Workspace Members List */}
      <div>
        <h3
          style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-3-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span style={{ color: 'var(--color-primary)', display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </span>
          Active Workspace Members
        </h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Spinner size="md" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
            {members.map((member) => {
              const memberUserId = member.user_id || member.id;
              const isSelf = Boolean(user?.id && memberUserId === user.id);
              const displayName = member.user_name || member.name || member.user_email || member.email || 'Member';
              const displayEmail = member.user_email || member.email;

              return (
                <div
                  key={member.id}
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-3) var(--space-4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Left: Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'var(--color-primary-subtle)',
                        color: 'var(--color-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'var(--font-weight-bold)',
                        fontSize: 'var(--font-size-md)',
                        flexShrink: 0,
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-0-5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                          {displayName}
                        </span>
                        {isSelf && (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', fontWeight: 'var(--font-weight-normal)' }}>(You)</span>
                        )}
                        <span
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-bold)',
                            padding: 'var(--space-0-5) var(--space-2)',
                            borderRadius: 'var(--radius-xs)',
                            letterSpacing: '0.04em',
                            ...getRoleBadgeStyle(member.role),
                          }}
                        >
                          {member.role}
                        </span>
                      </div>

                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', display: 'flex', gap: 'var(--space-2)' }}>
                        {displayEmail && displayEmail !== displayName && (
                          <>
                            <span>{displayEmail}</span>
                            <span>·</span>
                          </>
                        )}
                        <span>Joined {new Date(member.joined_at || member.joinedAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Member Management Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {canManageMembers && !isSelf && member.role !== 'OWNER' && (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(memberUserId, e.target.value, member.version || 1)}
                        disabled={actionUserId === memberUserId || (userRole === 'ADMIN' && member.role === 'ADMIN')}
                        style={{
                          background: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: 'var(--space-1) var(--space-2)',
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                        {isOwner && <option value="ADMIN">Admin</option>}
                      </select>
                    )}

                    {isOwner && !isSelf && (
                      <button
                        className="btn"
                        style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-2-5)', color: 'var(--color-primary)', borderColor: 'var(--color-border-subtle)' }}
                        onClick={() => handleTransferOwnership(memberUserId)}
                        disabled={actionUserId === memberUserId}
                      >
                        Make Owner
                      </button>
                    )}

                    {canManageMembers && !isSelf && member.role !== 'OWNER' && (
                      <button
                        className="btn"
                        style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-2-5)', color: 'var(--color-danger)', borderColor: 'var(--color-border-subtle)' }}
                        onClick={() => handleRemoveMember(memberUserId)}
                        disabled={actionUserId === memberUserId || (userRole === 'ADMIN' && member.role === 'ADMIN')}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
