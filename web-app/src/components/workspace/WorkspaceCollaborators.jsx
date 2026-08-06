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

      setNotice({ type: 'success', text: `Invitation sent successfully to ${inviteEmail.trim()} as ${selectedRole}!` });
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
        return { background: 'rgba(62, 207, 142, 0.15)', color: '#3ecf8e', border: '1px solid rgba(62, 207, 142, 0.3)' };
      case 'ADMIN':
        return { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'EDITOR':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
      default:
        return { background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' };
    }
  };

  const isOwner = user?.id && workspace?.owner_id && user.id === workspace.owner_id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '0.5rem 0' }}>
      {/* ---------- HERO BANNER ---------- */}
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              fontSize: '24px',
            }}
          >
            <i className="ti ti-users"></i>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px 0' }}>
              Workspace Collaborators
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
              Invite team members, assign access permissions, and manage workspace membership.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              color: 'var(--text-2)',
              fontFamily: 'var(--mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></span>
            {members.length} Active Member{members.length !== 1 ? 's' : ''}
          </div>

          {!isOwner && (
            <button
              className="btn"
              onClick={handleLeaveWorkspace}
              style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--danger)', borderColor: 'var(--border-strong)' }}
            >
              <i className="ti ti-logout"></i> Leave Workspace
            </button>
          )}
        </div>
      </div>

      {/* NOTICE BANNER */}
      {notice && (
        <div
          style={{
            background: notice.type === 'success' ? 'rgba(62, 207, 142, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${notice.type === 'success' ? 'var(--accent)' : 'var(--danger)'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            color: notice.type === 'success' ? 'var(--accent)' : 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className={notice.type === 'success' ? 'ti ti-circle-check' : 'ti ti-alert-triangle'}></i>
          {notice.text}
        </div>
      )}

      {/* ---------- INVITE FORM CARD ---------- */}
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h3
          style={{
            fontSize: '15px',
            fontWeight: '600',
            color: 'var(--text)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="ti ti-user-plus" style={{ color: 'var(--accent)' }}></i> Invite New Team Member
        </h3>

        <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@university.edu"
            required
            style={{
              flex: 2,
              minWidth: '240px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'var(--text)',
              outline: 'none',
            }}
          />

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              flex: 1,
              minWidth: '160px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'var(--text)',
              outline: 'none',
              cursor: 'pointer',
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
            style={{ padding: '10px 20px', fontSize: '13px', gap: '6px' }}
          >
            <i className="ti ti-send"></i> {inviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {/* ---------- ACTIVE MEMBERS LIST CARD ---------- */}
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h3
          style={{
            fontSize: '15px',
            fontWeight: '600',
            color: 'var(--text)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="ti ti-users" style={{ color: 'var(--accent)' }}></i> Active Workspace Members
        </h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spinner size="md" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map((member) => {
              const memberUserId = member.user_id || member.id;
              const isSelf = user?.id && memberUserId === user.id;

              return (
                <div
                  key={member.id}
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'var(--accent-bg)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        fontWeight: '700',
                        fontSize: '15px',
                      }}
                    >
                      {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {member.name || member.email || 'Member'}
                        {isSelf && (
                          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>(You)</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                        User ID: {String(memberUserId).slice(0, 18)}...
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        letterSpacing: '.03em',
                        ...getRoleBadgeStyle(member.role),
                      }}
                    >
                      {member.role}
                    </span>

                    <span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                      Joined {new Date(member.joined_at || member.joinedAt || Date.now()).toLocaleDateString()}
                    </span>

                    {/* Owner Action: Transfer Ownership */}
                    {isOwner && !isSelf && (
                      <button
                        className="btn"
                        style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--accent)', borderColor: 'var(--border)' }}
                        onClick={() => handleTransferOwnership(memberUserId)}
                        disabled={actionUserId === memberUserId}
                      >
                        <i className="ti ti-crown"></i> Make Owner
                      </button>
                    )}

                    {/* Owner Action: Remove Member */}
                    {isOwner && !isSelf && (
                      <button
                        className="btn"
                        style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--border)' }}
                        onClick={() => handleRemoveMember(memberUserId)}
                        disabled={actionUserId === memberUserId}
                      >
                        <i className="ti ti-trash"></i> Remove
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
