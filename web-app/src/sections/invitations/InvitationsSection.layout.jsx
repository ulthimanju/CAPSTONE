/**
 * InvitationsSection — Structural Layout Layer
 *
 * Renders raw received pending invitations JSON payload.
 */

import React from 'react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';

export function InvitationsSectionLayout({
  invitationsData,
  isLoading,
  error,
  onRefetch,
  onAcceptInvitation,
  onRejectInvitation,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Page Header */}
      <PageHeader
        title="Workspace Invitations"
        description="View and respond to pending workspace collaboration invitations"
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <CopyPayloadButton payload={invitationsData} />
          <Button variant="secondary" size="sm" onClick={onRefetch} disabled={isLoading}>
            Refetch Invitations
          </Button>
        </div>
      </PageHeader>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--error-subtle)',
            color: 'var(--error-text)',
            border: '1px solid var(--error)',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <strong>Error:</strong> {typeof error === 'object' ? JSON.stringify(error) : error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Loading pending invitations payload...
        </div>
      ) : (
        /* Raw JSON Display */
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              borderBottom: '1px solid var(--line-soft)',
              paddingBottom: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Raw API Payload
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {invitationsData ? `${JSON.stringify(invitationsData).length} bytes` : '0 bytes'}
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: '1.5',
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(invitationsData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
