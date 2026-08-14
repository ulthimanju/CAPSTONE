/**
 * DocumentsSection — Structural Layout Layer
 *
 * Displays the workspace documents and provides file upload in main-header via HeaderPortal.
 */

import React, { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { HeaderPortal } from '@/components/layout/HeaderPortal';
import { Upload } from 'lucide-react';

export function DocumentsSectionLayout({
  workspaceId,
  documentsData,
  isLoading,
  isUploading,
  error,
  onUploadFile,
  onDeleteDocument,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Header Action Portal — places Upload Document button on main-header right side */}
      <HeaderPortal target="actions">
        <Button
          variant="primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          loading={isUploading}
          disabled={isLoading}
        >
          <Upload size={14} style={{ marginRight: '6px' }} />
          Upload Document
        </Button>
      </HeaderPortal>

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
          Loading documents payload...
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
              {documentsData ? `${JSON.stringify(documentsData).length} bytes` : '0 bytes'}
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
            {JSON.stringify(documentsData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
