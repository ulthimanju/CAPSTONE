import React, { useState } from 'react';
import { FileText, ChevronDown, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

export function CitationBadge({ citation, index }) {
  const [isOpen, setIsOpen] = useState(false);

  const docName = citation.document_name || `Document ${citation.document_id ? citation.document_id.slice(0, 8) : ''}`;
  const chunkInfo = citation.chunk_index !== undefined && citation.chunk_index !== null ? ` • Part ${citation.chunk_index + 1}` : '';
  const scorePercent = citation.similarity_score ? Math.round(citation.similarity_score * 100) : null;

  return (
    <div className="relative inline-block text-left my-1 mr-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-ui px-2.5 py-1 text-[11px] font-mono transition-all border',
          isOpen
            ? 'bg-accent/15 text-accent border-accent/40 font-bold'
            : 'bg-sand/70 hover:bg-sand text-text/80 border-sep-line/60 hover:text-text'
        )}
        title="View source citation from workspace documents"
      >
        <FileText className="h-3 w-3 text-accent shrink-0" />
        <span className="truncate max-w-[160px] font-semibold">{docName}</span>
        {scorePercent && (
          <span className="text-[10px] text-text/50 font-normal">({scorePercent}%)</span>
        )}
        <ChevronDown className={cn('h-3 w-3 text-text/50 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Popover Card */}
          <div className="absolute left-0 top-full z-50 mt-1.5 w-80 sm:w-96 rounded-ui border border-sep-line bg-surface p-3.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-sep-line pb-2 mb-2">
              <div className="flex items-center gap-1.5 text-accent font-display text-xs font-bold truncate">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{docName}</span>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] text-accent border-accent/30 bg-accent/5 shrink-0">
                Score: {citation.similarity_score}
              </Badge>
            </div>

            <div className="text-xs font-sans text-text/80 leading-relaxed max-h-48 overflow-y-auto bg-sand/30 p-2.5 rounded-sm border border-sep-line/40 italic">
              "{citation.snippet || 'Referenced document passage.'}"
            </div>

            <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-text/50 pt-1">
              <span>{chunkInfo || 'Indexed Vector Chunk'}</span>
              <span>Grounding Source #{index + 1}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CitationBadge;
