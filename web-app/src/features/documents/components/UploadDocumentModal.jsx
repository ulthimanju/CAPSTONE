import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useUploadDocumentMutation } from '../hooks/useDocuments';

const ALLOWED_EXTENSIONS = [
  'pdf', 'docx', 'wps', 'pptx', 'key', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'tif', 'tiff'
];

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff'];

function getFileIcon(ext) {
  const e = ext.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'tif', 'tiff'].includes(e)) return ImageIcon;
  if (['xlsx', 'csv'].includes(e)) return FileSpreadsheet;
  if (['pptx', 'key'].includes(e)) return Presentation;
  return FileText;
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function UploadDocumentModal({ workspaceId, open, onOpenChange }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const uploadMutation = useUploadDocumentMutation(workspaceId, {
    onSuccess: () => {
      setSelectedFile(null);
      setUploadProgress(0);
      setErrorMsg(null);
      onOpenChange(false);
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to upload document.');
    },
  });

  const validateAndSetFile = (file) => {
    setErrorMsg(null);
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMsg(
        'Unsupported file format. Supported: PDF, DOCX, WPS, PPTX, KEY, XLSX, CSV, PNG, JPG, TIFF.'
      );
      return;
    }

    const isImage = IMAGE_EXTENSIONS.includes(ext);
    const maxBytes = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

    if (file.size > maxBytes) {
      setErrorMsg(
        isImage
          ? 'Image file size exceeds maximum allowed limit of 10 MB.'
          : 'Document file size exceeds maximum allowed limit of 50 MB.'
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setUploadProgress(0);
    uploadMutation.mutate({
      file: selectedFile,
      onUploadProgress: (pct) => setUploadProgress(pct),
    });
  };

  const handleClose = (nextOpen) => {
    if (!uploadMutation.isPending) {
      setSelectedFile(null);
      setErrorMsg(null);
      setUploadProgress(0);
      onOpenChange(nextOpen);
    }
  };

  const ext = selectedFile ? selectedFile.name.split('.').pop()?.toLowerCase() : '';
  const FileIcon = getFileIcon(ext);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Attach syllabus notes, slides, or study documents to this workspace for AI synthesis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.wps,.pptx,.key,.xlsx,.csv,.png,.jpg,.jpeg,.tif,.tiff"
            onChange={handleFileChange}
          />

          {/* Dropzone Area */}
          {!selectedFile && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-ui border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-150 ${
                isDragOver
                  ? 'border-accent bg-sand/70 scale-[0.99]'
                  : 'border-sep-line bg-bg hover:border-accent hover:bg-surface-hover'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-surface-raised text-accent">
                <UploadCloud className="h-6 w-6" aria-hidden="true" />
              </div>

              <p className="mt-3 font-display text-sm font-bold text-text">
                Click to browse or drag and drop file here
              </p>
              <p className="mt-1 font-mono text-[11px] text-text/60">
                PDF, DOCX, PPTX, XLSX, CSV (up to 50MB) • PNG, JPG (up to 10MB)
              </p>
            </div>
          )}

          {/* Selected File Card */}
          {selectedFile && (
            <div className="rounded-ui border border-sep-line bg-sand/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border border-sep-line bg-surface-raised text-accent">
                    <FileIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xs font-bold text-text truncate">
                      {selectedFile.name}
                    </p>
                    <p className="font-mono text-[11px] text-text/60">
                      {formatBytes(selectedFile.size)} • {ext.toUpperCase()}
                    </p>
                  </div>
                </div>

                {!uploadMutation.isPending && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="rounded-ui p-1.5 text-text/50 hover:bg-danger-tint hover:text-danger transition-colors"
                    aria-label="Remove selected file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Upload Progress Bar */}
              {uploadMutation.isPending && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between font-mono text-[11px] text-text/70">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full bg-accent transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-ui border border-danger/40 bg-danger-tint p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!selectedFile || uploadMutation.isPending}
            isLoading={uploadMutation.isPending}
            onClick={handleUpload}
          >
            Upload Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UploadDocumentModal;
