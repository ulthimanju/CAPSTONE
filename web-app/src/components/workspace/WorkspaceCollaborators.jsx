import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const WorkspaceCollaborators = ({ workspace }) => {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('VIEWER');
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState(null);

  // Mock list of current members (including workspace owner)
  const [members, setMembers] = useState([
    {
      id: user?.id || 'owner-1',
      name: user?.name || user?.email?.split('@')[0] || 'Workspace Owner',
      email: user?.email || 'owner@workspace.edu',
      role: 'OWNER',
      joinedAt: workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : 'Today',
      isCurrentUser: true,
    },
  ]);

  const [pendingInvites, setPendingInvites] = useState([]);

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setTimeout(() => {
      const newInvite = {
        id: `inv-${Date.now()}`,
        email: inviteEmail.trim(),
        role: selectedRole,
        sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setPendingInvites((prev) => [...prev, newInvite]);
      setInviteEmail('');
      setInviting(false);
      setNotice({ type: 'success', text: `Invitation sent to ${newInvite.email} as ${selectedRole}` });
      setTimeout(() => setNotice(null), 4000);
    }, 600);
  };

  const handleCancelInvite = (inviteId) => {
    setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {members.map((member) => (
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
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {member.name}
                    {member.isCurrentUser && (
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>(You)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{member.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                  Joined {member.joinedAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- PENDING INVITATIONS CARD ---------- */}
      {pendingInvites.length > 0 && (
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
            <i className="ti ti-mail-forward" style={{ color: '#3b82f6' }}></i> Pending Invitations ({pendingInvites.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="ti ti-mail" style={{ color: 'var(--text-3)', fontSize: '18px' }}></i>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{inv.email}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '10px' }}>
                      Invited as {inv.role} • {inv.sentAt}
                    </span>
                  </div>
                </div>

                <button
                  className="btn"
                  onClick={() => handleCancelInvite(inv.id)}
                  style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--border)' }}
                >
                  <i className="ti ti-x"></i> Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
