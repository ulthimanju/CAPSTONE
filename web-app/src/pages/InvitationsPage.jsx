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
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            className="btn"
            style={{ fontSize: 'var(--font-size-md)', padding: 'var(--space-1-5) var(--space-2-5)', gap: 'var(--space-1)' }}
            onClick={() => navigate('/workspaces')}
          >
            <i className="ti ti-arrow-left"></i> Workspaces
          </button>
          <div style={{ height: '16px', width: '1px', background: 'var(--color-border-subtle)' }}></div>
          <div className="topbar-title" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
            Workspace Invitations
          </div>
        </div>
      </div>

      <div className="content" style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--space-6)' }}>
        {/* HERO CARD */}
        <div
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--font-size-2xl)',
              }}
            >
              <i className="ti ti-mail-forward"></i>
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0' }}>
                Pending Invitations
              </h2>
              <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-muted)', margin: 0 }}>
                Review and accept invitations sent by workspace owners to join their project workspaces.
              </p>
            </div>
          </div>

          <div
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-1-5) var(--space-3-5)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1-5)',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }}></span>
            {invitations.length} Pending
          </div>
        </div>

        {/* NOTICE */}
        {notice && (
          <div
            style={{
              background: notice.type === 'success' ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
              border: `1px solid ${notice.type === 'success' ? 'var(--color-success-alpha-20)' : 'var(--color-danger-alpha-20)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--font-size-md)',
              color: notice.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger)',
              marginBottom: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <i className={notice.type === 'success' ? 'ti ti-circle-check' : 'ti ti-alert-triangle'}></i>
            {notice.text}
          </div>
        )}

        {/* INVITATIONS LIST */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
            <Spinner size="lg" />
          </div>
        ) : invitations.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '30vh',
              textAlign: 'center',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-12) var(--space-8)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--font-size-2xl)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <i className="ti ti-mail"></i>
            </div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-1-5)' }}>
              No Pending Invitations
            </h3>
            <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-muted)', maxWidth: '400px' }}>
              When a workspace owner invites you to collaborate on their workspace, invitations will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3-5)' }}>
            {invitations.map((inv) => (
              <div
                key={inv.id}
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-subtle)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--font-size-xl)',
                    }}
                  >
                    <i className="ti ti-folder"></i>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0' }}>
                      {inv.workspace_name || 'Workspace Project'}
                    </h3>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                      Invited by Owner • Status: PENDING
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2-5)', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary"
                    disabled={actionInvId === inv.id}
                    onClick={() => handleAccept(inv.id, inv.workspace_id)}
                    style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--font-size-md)', gap: 'var(--space-1-5)' }}
                  >
                    <i className="ti ti-check"></i> Accept Invitation
                  </button>
                  <button
                    className="btn"
                    disabled={actionInvId === inv.id}
                    onClick={() => handleReject(inv.id)}
                    style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--font-size-md)', color: 'var(--color-danger)', borderColor: 'var(--color-border-default)' }}
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
