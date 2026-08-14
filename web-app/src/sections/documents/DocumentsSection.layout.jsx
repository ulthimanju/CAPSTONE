/**
 * DocumentsSection — Structural Layout Layer
 *
 * Displays workspace documents as simple, elegant cards with status badges,
 * minimal metadata, external web_view_link navigation on click, and delete action.
 */

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { HeaderPortal } from '@/components/layout/HeaderPortal';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Trash2,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function getFileIcon(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['json', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css'].includes(ext)) return FileCode;
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return FileText;
  return File;
}

function getStatusStyle(status = '') {
  const s = status.toUpperCase();
  if (['INDEXED', 'READY', 'COMPLETED', 'ACTIVE'].includes(s)) {
    return {
      bg: 'var(--success-subtle, rgba(16, 185, 129, 0.1))',
      color: 'var(--success-text, #059669)',
      border: '1px solid var(--success, #10b981)',
    };
  }
  if (['PROCESSING', 'PENDING', 'PARSING', 'UPLOADING'].includes(s)) {
    return {
      bg: 'var(--warning-subtle, rgba(245, 158, 11, 0.1))',
      color: 'var(--warning-text, #d97706)',
      border: '1px solid var(--warning, #f59e0b)',
    };
  }
  if (['FAILED', 'ERROR'].includes(s)) {
    return {
      bg: 'var(--error-subtle, rgba(239, 68, 68, 0.1))',
      color: 'var(--error-text, #dc2626)',
      border: '1px solid var(--error, #ef4444)',
    };
  }
  return {
    bg: 'var(--bg-raised)',
    color: 'var(--text-muted)',
    border: '1px solid var(--line)',
  };
}

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
  const [deletingId, setDeletingId] = useState(null);

  const rawDocs = Array.isArray(documentsData?.documents)
    ? documentsData.documents
    : Array.isArray(documentsData)
    ? documentsData
    : [];

  const documents = rawDocs.filter((d) => !d.is_deleted && !d.deleted_at);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  const handleCardClick = (doc) => {
    const link =
      doc.storage_metadata_json?.web_view_link ||
      doc.storage_metadata_json?.webViewLink ||
      doc.web_view_link ||
      doc.webViewLink ||
      doc.url ||
      doc.download_url;

    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDeletingId(docId);
      try {
        await onDeleteDocument(docId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', width: '100%' }}>
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
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--error-subtle)',
            color: 'var(--error-text)',
            border: '1px solid var(--error)',
            fontSize: 'var(--text-sm)',
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
            padding: 'var(--space-12)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
          }}
        >
          Loading workspace documents...
        </div>
      ) : documents.length === 0 ? (
        /* Empty state */
        <div
          style={{
            padding: 'var(--space-12) var(--space-6)',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--line)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <FolderOpen size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--text)',
                marginBottom: 'var(--space-1)',
              }}
            >
              No Documents Uploaded Yet
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-soft)', maxWidth: '480px' }}>
              Upload your reference documents, PDF slides, or textbooks to ground workspace intelligence and learning paths.
            </div>
          </div>
          <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()} loading={isUploading}>
            <Upload size={16} style={{ marginRight: 'var(--space-2)' }} />
            Upload Document
          </Button>
        </div>
      ) : (
        /* Document Cards Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-5)',
            width: '100%',
          }}
        >
          {documents.map((doc) => {
            const Icon = getFileIcon(doc.original_filename);
            const status = doc.status || doc.parse_status || 'READY';
            const statusStyle = getStatusStyle(status);
            const link =
              doc.storage_metadata_json?.web_view_link ||
              doc.storage_metadata_json?.webViewLink ||
              doc.web_view_link ||
              doc.webViewLink ||
              doc.url ||
              doc.download_url;

            const isDeleting = deletingId === doc.id;

            return (
              <div
                key={doc.id}
                onClick={() => handleCardClick(doc)}
                role={link ? 'button' : undefined}
                tabIndex={link ? 0 : undefined}
                onKeyDown={(e) => {
                  if (link && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleCardClick(doc);
                  }
                }}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  cursor: link ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                  position: 'relative',
                  opacity: isDeleting ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (link) {
                    e.currentTarget.style.borderColor = 'var(--line-strong)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (link) {
                    e.currentTarget.style.borderColor = 'var(--line)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Card Top Row: File Icon, Status Badge, Delete Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-raised)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)',
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-semibold)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        border: statusStyle.border,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Actions: Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, doc.id)}
                    disabled={isDeleting}
                    aria-label="Delete document"
                    title="Delete document"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 'var(--space-1)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--error-text, #dc2626)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Card Middle: Document Filename */}
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--text)',
                    lineHeight: 'var(--leading-snug)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={doc.original_filename}
                >
                  {doc.original_filename}
                </div>

                {/* Card Bottom: Metadata & External Link Indicator */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--line-soft)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {doc.file_size_bytes > 0 && <span>{formatBytes(doc.file_size_bytes)}</span>}
                    {doc.created_at && <span>{formatDate(doc.created_at)}</span>}
                  </div>

                  {link && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--accent)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-medium)',
                      }}
                    >
                      <span>View</span>
                      <ExternalLink size={12} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
