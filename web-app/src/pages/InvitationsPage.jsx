import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api/client';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';

export const InvitationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInvId, setActionInvId] = useState(null);
  const [notice, setNotice] = useState(null);

  const getHeaders = () => {
    const headers = {};
    if (user?.id) headers['X-User-ID'] = user.id;
    if (user?.email) headers['X-User-Email'] = user.email;
    return headers;
  };

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/v1/invitations/pending', { headers: getHeaders() });
      setInvitations(res.data || []);
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (invitationId, workspaceId) => {
    try {
      setActionInvId(invitationId);
      await apiClient.post(`/api/v1/invitations/${invitationId}/accept`, {}, { headers: getHeaders() });
      setNotice({ type: 'success', text: 'Invitation accepted! Redirecting to workspace...' });
      setTimeout(() => {
        if (workspaceId) {
          navigate(`/workspaces/${workspaceId}`);
        } else {
          fetchInvitations();
        }
      }, 1200);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setNotice({ type: 'error', text: 'Failed to accept invitation. Please try again.' });
    } finally {
      setActionInvId(null);
    }
  };

  const handleReject = async (invitationId) => {
    try {
      setActionInvId(invitationId);
      await apiClient.post(`/api/v1/invitations/${invitationId}/reject`, {}, { headers: getHeaders() });
      setNotice({ type: 'info', text: 'Invitation declined.' });
      fetchInvitations();
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    } finally {
      setActionInvId(null);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <AppLayout activeTab="invitations">
      {/* Topbar Header */}
      <div className="topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn"
            style={{ fontSize: '13px', padding: '5px 10px', gap: '4px' }}
            onClick={() => navigate('/workspaces')}
          >
            <i className="ti ti-arrow-left"></i> Workspaces
          </button>
          <div style={{ height: '16px', width: '1px', background: 'var(--border)' }}></div>
          <div className="topbar-title" style={{ fontSize: '14px', fontWeight: 600 }}>
            Workspace Invitations
          </div>
        </div>
      </div>

      <div className="content" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* HERO CARD */}
        <div
          style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border-strong)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
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
              <i className="ti ti-mail-forward"></i>
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px 0' }}>
                Pending Invitations
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                Review and accept invitations sent by workspace owners to join their project workspaces.
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
            {invitations.length} Pending
          </div>
        </div>

        {/* NOTICE */}
        {notice && (
          <div
            style={{
              background: notice.type === 'success' ? 'rgba(62, 207, 142, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${notice.type === 'success' ? 'var(--accent)' : 'var(--danger)'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: notice.type === 'success' ? 'var(--accent)' : 'var(--danger)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className={notice.type === 'success' ? 'ti ti-circle-check' : 'ti ti-alert-triangle'}></i>
            {notice.text}
          </div>
        )}

        {/* INVITATIONS LIST */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner size="lg" />
          </div>
        ) : invitations.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justify: 'center',
              minHeight: '30vh',
              textAlign: 'center',
              background: 'var(--bg-1)',
              border: '1px solid var(--border-strong)',
              borderRadius: '12px',
              padding: '3rem 2rem',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                fontSize: '24px',
                marginBottom: '1rem',
              }}
            >
              <i className="ti ti-mail"></i>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.4rem' }}>
              No Pending Invitations
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '400px' }}>
              When a workspace owner invites you to collaborate on their workspace, invitations will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {invitations.map((inv) => (
              <div
                key={inv.id}
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      fontSize: '20px',
                    }}
                  >
                    <i className="ti ti-folder"></i>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', margin: '0 0 4px 0' }}>
                      {inv.workspace_name || 'Workspace Project'}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                      Invited by Owner • Status: PENDING
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary"
                    disabled={actionInvId === inv.id}
                    onClick={() => handleAccept(inv.id, inv.workspace_id)}
                    style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
                  >
                    <i className="ti ti-check"></i> Accept Invitation
                  </button>
                  <button
                    className="btn"
                    disabled={actionInvId === inv.id}
                    onClick={() => handleReject(inv.id)}
                    style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--border-strong)' }}
                  >
                    <i className="ti ti-x"></i> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
