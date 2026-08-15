import React from 'react';
import { BookOpen, Sparkles, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function OverviewTab({ workspace }) {
  const formattedCreated = new Date(workspace.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedUpdated = new Date(workspace.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isTechnical = workspace.domain_type === 'TECHNICAL';

  return (
    <div className="space-y-6">
      {/* Top Grid: Domain & Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-text/60">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Workspace Domain</span>
          </div>
          <div className="mt-2">
            <span className="font-display text-lg font-bold text-text">
              {isTechnical ? 'Technical Engineering' : 'Non-Technical Studies'}
            </span>
            <p className="mt-0.5 text-xs text-text/70 font-body">
              {isTechnical
                ? 'Optimized for code synthesis, algorithm proofs, and technical documents.'
                : 'Optimized for text analysis, qualitative synthesis, and literature comprehension.'}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-text/60">
            <Clock className="h-4 w-4 text-accent" />
            <span>Status & Lifecycle</span>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="font-display text-lg font-bold text-text">
                {workspace.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text/70 font-mono">
              Last updated {formattedUpdated}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-text/60">
            <Calendar className="h-4 w-4 text-accent" />
            <span>Created Date</span>
          </div>
          <div className="mt-2">
            <span className="font-display text-lg font-bold text-text">
              {formattedCreated}
            </span>
            <p className="mt-0.5 text-xs text-text/70 font-mono">
              Visibility: {workspace.visibility}
            </p>
          </div>
        </Card>
      </div>

      {/* AI Summary / Syllabus Overview Container */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-sep-line pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <h2 className="font-display text-base font-bold text-text">
              Study Path & AI Syllabus Overview
            </h2>
          </div>
          <Badge variant="default">SYNAPSE AI</Badge>
        </div>

        <div className="mt-4">
          <p className="font-body text-sm text-text/80 leading-relaxed">
            Upload course documents, syllabi, or lecture notes in the <span className="font-semibold text-accent">Documents</span> tab to generate an automated structured learning path, interactive flashcards, unit quizzes, and practice problem sets tailored to this {isTechnical ? 'technical' : 'study'} workspace.
          </p>

          <div className="mt-6 rounded-ui border border-sep-line bg-bg p-4">
            <div className="flex items-center gap-2 font-mono text-xs text-text/70">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>Workspace Ready for Document Parsing</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default OverviewTab;
