import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  CircleNotch,
  Sparkle,
} from '@/components/ui/icons';
import { Card, Button, Badge, BookLinearIcon, FlashcardsIcon, QuizIcon } from '@/components/ui';
import { ContentRenderer } from '@/components/common/ContentRenderer';
import {
  useDocumentQuery,
  useDocumentParseResultQuery,
} from '../hooks/useDocuments';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DocumentReaderPage() {
  const { workspaceId, documentId } = useParams();

  const {
    data: document,
    isLoading: isLoadingDoc,
    isError: isErrorDoc,
  } = useDocumentQuery(documentId);

  const {
    data: parseResult,
    isLoading: isLoadingParse,
  } = useDocumentParseResultQuery(documentId);

  if (isLoadingDoc) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
        <CircleNotch className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 font-mono text-xs text-text/70">
          Loading document content...
        </p>
      </div>
    );
  }

  if (isErrorDoc || !document) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="flex flex-col items-center justify-center border-danger/30 bg-danger-tint p-8 text-center">
          <h2 className="font-display text-lg font-bold text-danger">
            Document Not Found
          </h2>
          <p className="mt-1 font-mono text-xs text-text/80">
            The requested document could not be found or has been removed.
          </p>
          <Link to={`/workspaces/${workspaceId}/documents`} className="mt-5">
            <Button leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Documents
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const markdownContent = parseResult?.markdown_content || '';
  const isParsing = document.status === 'PROCESSING' || document.parse_status === 'PARSING' || isLoadingParse;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-sep-line pb-4">
        <div className="flex items-center gap-3">
          <Link to={`/workspaces/${workspaceId}/documents`}>
            <Button variant="outline" className="p-2" aria-label="Back to documents">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-text truncate max-w-md">
                {document.original_filename}
              </h1>
              <Badge variant="technical" className="text-[10px] py-0">
                {document.file_extension}
              </Badge>
            </div>
            <p className="font-mono text-xs text-text/60">
              {formatBytes(document.file_size_bytes)} • {document.is_split ? `Sliced (${document.part_count} parts)` : 'Single Document'}
            </p>
          </div>
        </div>

        {/* Study Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<FlashcardsIcon className="h-3.5 w-3.5 text-accent" />}
            className="text-xs"
          >
            Study Flashcards
          </Button>
          <Button
            leftIcon={<QuizIcon className="h-3.5 w-3.5" />}
            className="text-xs"
          >
            Generate Quiz
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left 3 Cols: Document Content */}
        <div className="lg:col-span-3">
          <Card className="min-h-[500px] p-6">
            {isParsing && !markdownContent && (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <CircleNotch className="h-8 w-8 animate-spin text-accent" />
                <h3 className="mt-3 font-display text-base font-bold text-text">
                  AI Document Parsing in Progress
                </h3>
                <p className="mt-1 max-w-md font-body text-xs text-text/70">
                  LlamaParse is extracting text, tables, and mathematical formulas from this document. Content will appear here automatically when indexing completes.
                </p>
              </div>
            )}

            {!isParsing && !markdownContent && (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <FileText className="h-10 w-10 text-text/40" />
                <h3 className="mt-3 font-display text-base font-bold text-text">
                  No parsed text content available
                </h3>
                <p className="mt-1 max-w-sm font-body text-xs text-text/70">
                  This document has not generated Markdown text yet.
                </p>
              </div>
            )}

            {markdownContent && (
              <div className="prose prose-stone max-w-none font-body text-sm text-text/90 leading-relaxed px-1">
                <ContentRenderer content={markdownContent} />
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Metadata & Units */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-display text-xs font-bold text-text uppercase tracking-wider">
              Document Insights
            </h3>
            <div className="space-y-2 text-xs font-mono text-text/70">
              <div className="flex justify-between border-b border-sep-line/60 pb-1.5">
                <span>Status:</span>
                <span className="font-semibold text-text">{document.status}</span>
              </div>
              <div className="flex justify-between border-b border-sep-line/60 pb-1.5">
                <span>Format:</span>
                <span className="text-text">{document.file_extension}</span>
              </div>
              <div className="flex justify-between border-b border-sep-line/60 pb-1.5">
                <span>Size:</span>
                <span className="text-text">{formatBytes(document.file_size_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Chunks:</span>
                <span className="text-text">{document.chunk_count || 'Pending'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 font-display text-xs font-bold text-text uppercase tracking-wider">
              <BookLinearIcon className="h-4 w-4 text-accent" />
              <span>Study Units</span>
            </div>
            <p className="font-body text-xs text-text/70">
              Extracted syllabus topics and concept hierarchies will be mapped here for active recall practice.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DocumentReaderPage;
