/**
 * CollaboratorsSection — Structural Layout Layer
 *
 * Renders invitation input controls and directly displays the raw received
 * workspace members JSON payload.
 */

import React from 'react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';

export function CollaboratorsSectionLayout({
  workspaceId,
  membersData,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  isLoading,
  isInviting,
  error,
  onRefetch,
  onInviteCollaborator,
  onRemoveMember,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Page Header */}
      <PageHeader
        title="Collaborators"
        description="Manage workspace team members, roles, and permissions"
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <CopyPayloadButton payload={membersData} />
          <Button variant="secondary" size="sm" onClick={onRefetch} disabled={isLoading || isInviting}>
            Refetch Members
          </Button>
        </div>
      </PageHeader>

      {/* Invite bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}
      >
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="Collaborator email address..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
            fontSize: '14px',
            outline: 'none',
          }}
        />

        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          style={{
            padding: '10px 12px',
            background: 'var(--bg)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
            fontSize: '14px',
            outline: 'none',
          }}
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>

        <Button
          variant="primary"
          size="sm"
          onClick={onInviteCollaborator}
          loading={isInviting}
          disabled={!inviteEmail.trim() || isLoading}
        >
          Invite Member
        </Button>
      </div>

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
          Loading workspace members payload...
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
              {membersData ? `${JSON.stringify(membersData).length} bytes` : '0 bytes'}
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
            {JSON.stringify(membersData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
