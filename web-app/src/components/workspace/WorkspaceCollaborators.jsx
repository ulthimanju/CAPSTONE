import React, { useState, useEffect, useMemo } from 'react';
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
    setMembers((prev) => prev.filter((m) => (m.user_id || m.id) !== memberUserId));

    try {
      setActionUserId(memberUserId);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.delete(`/api/v1/workspaces/${workspaceId}/members/${memberUserId}`, { headers });
      setNotice({ type: 'success', text: 'Member removed from workspace.' });
      fetchMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
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

  const isOwner = Boolean(user?.id && workspace?.owner_id && user.id === workspace.owner_id);
  const currentMember = members.find((m) => (m.user_id || m.id) === user?.id);
  const userRole = isOwner ? 'OWNER' : currentMember?.role || workspace?.user_role || 'VIEWER';
  const canManageMembers = userRole === 'OWNER' || userRole === 'ADMIN';
  const canInvite = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'EDITOR';

  // Compute breakdown stats
  const stats = useMemo(() => {
    const editorsCount = members.filter((m) => m.role === 'EDITOR' || m.role === 'ADMIN' || m.role === 'OWNER').length;
    const viewersCount = members.filter((m) => m.role === 'VIEWER').length;
    return {
      active: members.length,
      editors: editorsCount,
      viewers: viewersCount,
      pending: 0,
      totalCapacity: 10,
    };
  }, [members]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        padding: 'var(--space-6) var(--space-8)',
        background: 'var(--color-bg-base)',
        minHeight: '100%',
      }}
    >
      {/* ── 1. Page Header Title ── */}
      <div
        style={{
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          Collaborators Management
        </h1>

        {!isOwner && (
          <button
            className="btn"
            onClick={handleLeaveWorkspace}
            style={{
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-mono)',
              padding: 'var(--space-2) var(--space-4)',
              color: 'var(--color-danger)',
              borderColor: 'var(--color-border-subtle)',
              background: 'var(--color-bg-surface)',
            }}
          >
            Leave Workspace
          </button>
        )}
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          style={{
            background: notice.type === 'success' ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            border: `1px solid ${notice.type === 'success' ? 'var(--color-success-alpha-20)' : 'var(--color-danger-alpha-20)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3) var(--space-4)',
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

      {/* ── 2. Top Summary Stat Cards Grid (3 Columns) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-4)',
        }}
      >
        {/* Card 1: Active Members */}
        <div
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-5) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            minHeight: '150px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                ACTIVE MEMBERS
              </span>
              <i className="ti ti-users" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-md)' }} />
            </div>

            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem',
                fontWeight: 'var(--font-weight-normal)',
                color: 'var(--color-text-primary)',
                lineHeight: 1,
              }}
            >
              {stats.active}
            </div>
          </div>

          <div>
            <div style={{ height: '1px', background: 'var(--color-border-subtle)', margin: 'var(--space-4) 0 var(--space-3) 0' }} />
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
                  EDITORS
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                  {stats.editors}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
                  VIEWERS
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                  {stats.viewers}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Invites */}
        <div
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-5) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            justify: 'flex-start',
            minHeight: '150px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              PENDING INVITES
            </span>
            <i className="ti ti-mail" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-md)' }} />
          </div>

          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 'var(--font-weight-normal)',
              color: 'var(--color-text-primary)',
              lineHeight: 1,
            }}
          >
            {stats.pending}
          </div>
        </div>

        {/* Card 3: Total Capacity */}
        <div
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-5) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            justify: 'flex-start',
            minHeight: '150px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              TOTAL CAPACITY
            </span>
            <i className="ti ti-box" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-md)' }} />
          </div>

          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 'var(--font-weight-normal)',
              color: 'var(--color-text-primary)',
              lineHeight: 1,
            }}
          >
            {stats.totalCapacity}
          </div>
        </div>
      </div>

      {/* ── 3. Invite New Team Member Form ── */}
      {canInvite && (
        <div
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-6) var(--space-6)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-primary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <i className="ti ti-user-plus" />
            INVITE NEW TEAM MEMBER
          </div>

          <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@university.edu"
              required
              style={{
                flex: 1,
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3) var(--space-4)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                width: '220px',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3) var(--space-4)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                cursor: 'pointer',
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
              style={{
                padding: 'var(--space-3) var(--space-6)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-medium)',
                borderRadius: 'var(--radius-sm)',
                gap: 'var(--space-2)',
              }}
            >
              <i className="ti ti-send" />
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      )}

      {/* ── 4. Active Workspace Members List ── */}
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 'var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <i className="ti ti-users" style={{ color: 'var(--color-primary)' }} />
          ACTIVE WORKSPACE MEMBERS
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Spinner size="md" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {members.map((member) => {
              const memberUserId = member.user_id || member.id;
              const isSelf = Boolean(user?.id && memberUserId === user.id);
              const displayName = member.user_name || member.name || member.user_email || member.email || 'Member';
              const displayEmail = member.user_email || member.email;
              const initial = displayName.charAt(0).toUpperCase();

              return (
                <div
                  key={member.id}
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-4) var(--space-5)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                  }}
                >
                  {/* Left: Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--color-primary-subtle)',
                        color: 'var(--color-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justify: 'center',
                        fontWeight: 'var(--font-weight-bold)',
                        fontSize: 'var(--font-size-lg)',
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2.5)' }}>
                        <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                          {displayName}
                        </span>

                        {isSelf && (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>(You)</span>
                        )}

                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-bold)',
                            padding: 'var(--space-0-5) var(--space-2)',
                            borderRadius: 'var(--radius-xs)',
                            letterSpacing: '0.04em',
                            background: member.role === 'OWNER' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                            color: member.role === 'OWNER' ? 'var(--color-primary-contrast)' : 'var(--color-text-secondary)',
                            border: member.role === 'OWNER' ? 'none' : '1px solid var(--color-border-subtle)',
                          }}
                        >
                          {member.role}
                        </span>
                      </div>

                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Joined {new Date(member.joined_at || member.joinedAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Right: Member Management Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2.5)' }}>
                    {canManageMembers && !isSelf && member.role !== 'OWNER' && (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(memberUserId, e.target.value, member.version || 1)}
                        disabled={actionUserId === memberUserId || (userRole === 'ADMIN' && member.role === 'ADMIN')}
                        style={{
                          background: 'var(--color-bg-surface)',
                          border: '1px solid var(--color-border-default)',
                          borderRadius: 'var(--radius-sm)',
                          padding: 'var(--space-1-5) var(--space-3)',
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

                    {canManageMembers && !isSelf && member.role !== 'OWNER' && (
                      <button
                        className="btn"
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          padding: 'var(--space-1-5) var(--space-3)',
                          color: 'var(--color-danger)',
                          borderColor: 'var(--color-border-subtle)',
                          background: 'var(--color-bg-surface)',
                        }}
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
