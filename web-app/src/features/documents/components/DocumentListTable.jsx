import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Trash,
  ArrowSquareOut,
  CircleNotch,
  CheckCircle,
  WarningCircle,
  Clock,
} from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteDocumentMutation } from '../hooks/useDocuments';

function getFileIcon(ext) {
  const e = (ext || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'tif', 'tiff'].includes(e)) return ImageIcon;
  if (['xlsx', 'csv'].includes(e)) return FileSpreadsheet;
  if (['pptx', 'key'].includes(e)) return Presentation;
  return FileText;
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function DocumentListTable({ workspaceId, documents = [] }) {
  const [docToDelete, setDocToDelete] = useState(null);

  const deleteMutation = useDeleteDocumentMutation(workspaceId, {
    onSuccess: () => {
      setDocToDelete(null);
    },
  });

  const handleConfirmDelete = () => {
    if (docToDelete) {
      deleteMutation.mutate(docToDelete.id);
    }
  };

  const renderStatusBadge = (doc) => {
    const status = (doc.status || '').toUpperCase();
    const parseStatus = (doc.parse_status || '').toUpperCase();

    if (status === 'UPLOADING' || doc.is_optimistic) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-ui bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent border border-accent/30">
          <CircleNotch className="h-3 w-3 animate-spin" />
          <span>UPLOADING</span>
        </span>
      );
    }

    if (
      status === 'INDEXED' ||
      status === 'READY_FOR_RAG' ||
      status === 'PARSED' ||
      parseStatus === 'COMPLETED'
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-ui bg-success/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-success border border-success/30">
          <CheckCircle className="h-3 w-3" />
          <span>INDEXED</span>
        </span>
      );
    }

    if (status === 'PROCESSING' || status === 'PENDING' || parseStatus === 'PARSING') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-ui bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent border border-accent/30">
          <CircleNotch className="h-3 w-3 animate-spin" />
          <span>PARSING</span>
        </span>
      );
    }

    if (status === 'FAILED' || parseStatus === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-ui bg-danger-tint px-2 py-0.5 font-mono text-[10px] font-semibold text-danger border border-danger/30">
          <WarningCircle className="h-3 w-3" />
          <span>FAILED</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-ui bg-sand px-2 py-0.5 font-mono text-[10px] font-medium text-text/70 border border-sep-line">
        <Clock className="h-3 w-3" />
        <span>{status || 'UPLOADED'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden divide-y divide-sep-line">
        {/* Table Header (Desktop) */}
        <div className="hidden grid-cols-12 gap-4 bg-sand/40 px-4 py-3 font-mono text-[11px] font-semibold uppercase text-text/60 sm:grid">
          <div className="col-span-7">Document Name</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-right">Size</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {/* Rows */}
        {documents.map((doc) => {
          const ext = (doc.file_extension || '').toLowerCase();
          const filename = (doc.original_filename || '').toLowerCase();
          const isPdf = ext === 'pdf' || filename.endsWith('.pdf');
          const isDocx =
            ext === 'docx' ||
            ext === 'doc' ||
            ext === 'wps' ||
            filename.endsWith('.docx') ||
            filename.endsWith('.doc') ||
            filename.endsWith('.wps');
          const isKey = ext === 'key' || filename.endsWith('.key');
          const isPptx =
            ext === 'pptx' ||
            ext === 'ppt' ||
            filename.endsWith('.pptx') ||
            filename.endsWith('.ppt');
          const isXlsx =
            ext === 'xlsx' ||
            ext === 'xls' ||
            filename.endsWith('.xlsx') ||
            filename.endsWith('.xls');
          const isCsv = ext === 'csv' || filename.endsWith('.csv');
          const isTxt =
            ext === 'txt' ||
            ext === 'text' ||
            filename.endsWith('.txt') ||
            filename.endsWith('.text');
          const isImage =
            ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'webp', 'bmp', 'gif'].includes(ext) ||
            ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp', '.bmp', '.gif'].some((s) =>
              filename.endsWith(s)
            );
          const FileIcon = getFileIcon(doc.file_extension);
          const webViewLink =
            doc.storage_metadata_json?.web_view_link || doc.web_view_link;

          const formattedDate = new Date(doc.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <div
              key={doc.id}
              className="flex flex-col gap-3 p-4 hover:bg-surface-hover/50 transition-colors sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              {/* Document Info & Direct Web View Link */}
              <div className="col-span-7 flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ui border border-sep-line bg-sand/70 p-1 text-accent shadow-xs">
                  {isPdf ? (
                    <img
                      src="/icons/pdf-icon.svg"
                      alt="PDF Document"
                      className="h-8 w-8 object-contain"
                    />
                  ) : isDocx ? (
                    <img
                      src="/icons/docx-icon.svg"
                      alt="Word Document"
                      className="h-8 w-8 object-contain"
                    />
                  ) : isKey ? (
                    <img
                      src="/icons/key-icon.png"
                      alt="Apple Keynote Presentation"
                      className="h-8 w-8 object-contain"
                    />
                  ) : isPptx ? (
                    <img
                      src="/icons/pptx-icon.svg"
                      alt="PowerPoint Presentation"
                      className="h-8 w-8 object-contain"
                    />
                  ) : isXlsx ? (
                    <img
                      src="/icons/xlsx-icon.svg"
                      alt="Excel Spreadsheet"
                      className="h-8 w-8 object-contain"
                    />
                  ) : isCsv ? (
                    <img
                      src="/icons/csv-icon.svg"
                      alt="CSV Spreadsheet"
                      className="h-8 w-8 object-contain"
                    />
                  ) : isTxt ? (
                    <img
                      src="/icons/txt-icon.svg"
                      alt="Text Document"
                      className="h-8 w-8 object-contain"
                    />
                  ) : isImage ? (
                    <img
                      src="/icons/image-icon.png"
                      alt="Image File"
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <FileIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  {webViewLink ? (
                    <a
                      href={webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display text-sm font-bold text-text hover:text-accent truncate flex items-center gap-1.5 group"
                      title={doc.original_filename}
                    >
                      <span className="truncate">{doc.original_filename}</span>
                      <ArrowSquareOut className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <Link
                      to={`/workspaces/${workspaceId}/documents/${doc.id}`}
                      className="font-display text-sm font-bold text-text hover:text-accent truncate block"
                      title={doc.original_filename}
                    >
                      {doc.original_filename}
                    </Link>
                  )}
                  <p className="font-mono text-[11px] text-text/50">
                    Uploaded {formattedDate}
                    {doc.is_split ? ` • Sliced (${doc.part_count} parts)` : ''}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2 sm:text-center">
                {renderStatusBadge(doc)}
              </div>

              {/* Size */}
              <div className="col-span-2 font-mono text-xs text-text/70 sm:text-right">
                {formatBytes(doc.file_size_bytes)}
              </div>

              {/* Actions: Delete only */}
              <div className="col-span-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setDocToDelete(doc)}
                  disabled={doc.is_optimistic || doc.status === 'UPLOADING'}
                  className="rounded-ui p-1.5 text-text/50 hover:bg-danger-tint hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-30 disabled:pointer-events-none"
                  aria-label={`Delete ${doc.original_filename}`}
                  title="Delete Document"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Delete Document Confirmation Dialog */}
      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open) => {
          if (!open) setDocToDelete(null);
        }}
        title="Delete Document"
        description={`Are you sure you want to delete "${docToDelete?.original_filename}"? This will remove all parsed markdown content and AI vector embeddings.`}
        confirmText="Delete Document"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default DocumentListTable;
