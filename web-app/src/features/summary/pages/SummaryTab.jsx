import React from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Sparkles,
  BookOpen,
  Loader2,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useWorkspaceSummaryQuery, useGenerateSummaryMutation } from '../hooks/useSummary';
import { MermaidDiagram } from '../components/MermaidDiagram';

const markdownComponents = {
  table: ({ node, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-ui border border-sep-line bg-surface shadow-sm">
      <table className="min-w-full divide-y divide-sep-line text-left font-sans text-xs sm:text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="bg-sand/60 font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text/80" {...props} />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="divide-y divide-sep-line bg-surface" {...props} />
  ),
  tr: ({ node, ...props }) => (
    <tr className="hover:bg-surface-hover/50 transition-colors" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th className="px-4 py-3 font-bold text-text border-r border-sep-line last:border-r-0" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="px-4 py-3 text-text/80 border-r border-sep-line last:border-r-0 leading-normal" {...props} />
  ),
  code: ({ node, inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code className="rounded bg-sand px-1.5 py-0.5 font-mono text-xs font-semibold text-accent" {...props}>
          {children}
        </code>
      );
    }
    return (
      <div className="my-3 overflow-x-auto rounded-ui border border-sep-line bg-sand/30 p-3.5 font-mono text-xs text-text">
        <code className="block leading-relaxed" {...props}>
          {children}
        </code>
      </div>
    );
  },
};

export function SummaryTab() {
  const { workspaceId } = useParams();
  const { data: summaryData, isLoading } = useWorkspaceSummaryQuery(workspaceId);
  const generateMutation = useGenerateSummaryMutation(workspaceId);

  const summary = summaryData?.summary;
  const hasSummary = Boolean(
    summary && (summary.overview || (summary.sections && summary.sections.length > 0))
  );

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="font-mono text-sm text-text/60">Loading workspace summary...</p>
        </div>
      </div>
    );
  }

  if (generateMutation.isPending) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center border-accent/30 bg-accent/5">
        <div className="relative mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Sparkles className="h-7 w-7 animate-pulse" />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-accent" />
        </div>
        <h3 className="font-display text-lg font-bold text-text">Synthesizing with Gemini 2.5 Flash</h3>
        <p className="mt-2 max-w-md text-sm text-text/70 font-sans">
          Gemini is analyzing all uploaded workspace documents, extracting key concepts, building comparison tables, and generating architecture diagrams. This may take 15–30 seconds.
        </p>
      </Card>
    );
  }

  if (!hasSummary) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-sep-line bg-surface">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-accent mb-4">
          <Sparkles className="h-7 w-7" />
        </div>
        <h3 className="font-display text-lg font-bold text-text">No Workspace Summary Generated</h3>
        <p className="mt-2 max-w-md text-sm text-text/60 font-sans">
          Synthesize all documents, textbooks, and notes in this workspace into a comprehensive, university-level study guide with architecture diagrams.
        </p>
        <div className="mt-6">
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Summary with Gemini</span>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      {summary.overview && (
        <Card className="border-accent/20 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-3 border-b border-sep-line pb-3">
            <div className="flex items-center gap-2 text-accent">
              <BookOpen className="h-5 w-5" />
              <h2 className="font-display text-base font-bold text-text">Executive Synthesis</h2>
            </div>
            <Badge variant="outline" className="font-mono text-[11px] text-accent border-accent/30 bg-accent/5">
              Gemini 2.5 Flash
            </Badge>
          </div>
          <div className="prose prose-sm max-w-none text-text/80 leading-relaxed font-sans">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={markdownComponents}
            >
              {summary.overview}
            </ReactMarkdown>
          </div>
        </Card>
      )}

      {/* Sections List */}
      {summary.sections && summary.sections.length > 0 && (
        <div className="space-y-6">
          {summary.sections.map((section, idx) => (
            <Card key={section.id || idx} className="p-6 bg-surface shadow-sm">
              <div className="flex items-center gap-3 border-b border-sep-line pb-3 mb-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand font-mono text-xs font-bold text-accent">
                  {idx + 1}
                </span>
                <h3 className="font-display text-base font-bold text-text">{section.title}</h3>
              </div>

              {/* Section Prose / Markdown with Table & KaTeX Support */}
              {section.content && (
                <div className="prose prose-sm max-w-none text-text/80 leading-relaxed font-sans overflow-x-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {section.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Mermaid Diagram */}
              {section.diagram && section.diagram_type !== 'none' && (
                <div className="mt-4">
                  <MermaidDiagram chart={section.diagram} caption={section.diagram_caption} />
                </div>
              )}

              {/* Key Takeaways */}
              {section.key_takeaways && (
                <div className="mt-4 rounded-ui bg-sand/60 border border-sep-line p-3.5 flex items-start gap-2.5">
                  <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent mb-0.5">
                      Key Takeaway
                    </p>
                    <p className="text-xs text-text/80 font-sans">{section.key_takeaways}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Workspace-Level Key Takeaways */}
      {summary.key_takeaways && summary.key_takeaways.length > 0 && (
        <Card className="p-6 bg-surface border-success/30 shadow-sm">
          <div className="flex items-center gap-2 text-success mb-3">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-display text-base font-bold text-text">Key Mastery Takeaways</h3>
          </div>
          <ul className="space-y-2 text-sm text-text/80">
            {summary.key_takeaways.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-success font-bold mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default SummaryTab;
