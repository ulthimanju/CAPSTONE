import React from 'react';
import { FileText, Upload, FolderArchive } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GoogleDriveIcon } from '@/components/ui/GoogleDriveIcon';

export function DocumentsTab({ workspace }) {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-text">
            Workspace Documents
          </h2>
          <p className="font-body text-xs text-text/70">
            Source documents parsed into vector embeddings for contextual AI tutoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<GoogleDriveIcon className="h-4 w-4" />} className="text-xs">
            Import from Drive
          </Button>
          <Button leftIcon={<Upload className="h-4 w-4" />} className="text-xs">
            Upload PDF
          </Button>
        </div>
      </div>

      {/* Empty Documents State */}
      <Card className="flex flex-col items-center justify-center border-dashed border-sep-line py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
          <FileText className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-3 font-display text-base font-bold text-text">
          No documents attached yet
        </h3>
        <p className="mt-1 max-w-sm font-body text-xs text-text/70 leading-relaxed">
          Upload PDF textbooks, lecture slides, or import files from Google Drive to initialize AI search and study units.
        </p>
      </Card>
    </div>
  );
}

export default DocumentsTab;
