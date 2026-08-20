import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkle,
  CircleNotch,
  Lightbulb,
  CheckCircle,
} from '@/components/ui/icons';
import { Card, Button, Badge, BookLinearIcon, RegenerateIcon } from '@/components/ui';
import { useWorkspaceSummaryQuery, useGenerateSummaryMutation, useSummaryStore } from '../hooks/useSummary';
import { MermaidDiagram } from '../components/MermaidDiagram';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { toast } from 'sonner';
import hljs from 'highlight.js';

export function SectionCodeCard({ snippet, language, explanation }) {
  const [copied, setCopied] = React.useState(false);

  const highlightedHtml = React.useMemo(() => {
    if (!snippet) return '';
    try {
      const validLang = language && hljs.getLanguage(language.toLowerCase()) ? language.toLowerCase() : null;
      if (validLang) {
        return hljs.highlight(snippet, { language: validLang }).value;
      }
      return hljs.highlightAuto(snippet).value;
    } catch {
      return snippet;
    }
  }, [snippet, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-ui border border-sep-line/80 bg-sand/40 shadow-xs">
      <div className="flex items-center justify-between border-b border-sep-line/60 bg-sand/60 px-3.5 py-1.5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent border border-accent/25">
            {language || 'Code'}
          </span>
          {explanation && (
            <span className="truncate font-sans text-xs italic text-text/75">
              {explanation}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded border border-sep-line/70 bg-surface px-2.5 py-0.5 font-mono text-[10px] text-text/80 transition-colors hover:bg-surface-hover hover:text-accent shadow-2xs"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed bg-sand/40 text-text hljs">
        <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      </pre>
    </div>
  );
}

export function SummaryTab() {
  const { workspaceId } = useParams();
  const { data: summaryData, isLoading } = useWorkspaceSummaryQuery(workspaceId);
  const generateMutation = useGenerateSummaryMutation(workspaceId);
  const isGenerating = useSummaryStore((state) =>
    Boolean(state.generatingWorkspaces[workspaceId])
  );

  const summary = summaryData?.summary;
  const hasSummary = Boolean(
    summary && (summary.overview || (summary.sections && summary.sections.length > 0))
  );

  const handleGenerate = () => {
    if (!workspaceId || generateMutation.isPending || isGenerating) return;

    generateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Workspace summary generation started with Gemini 2.5 Flash.');
      },
      onError: (err) => {
        toast.error(err?.message || 'Failed to start summary generation.');
      },
    });
  };

  if (isLoading && !hasSummary && !isGenerating) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <CircleNotch className="h-8 w-8 animate-spin text-accent" />
          <p className="font-mono text-sm text-text/60">Loading workspace summary...</p>
        </div>
      </div>
    );
  }

  if (isGenerating && !hasSummary) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-accent/40 bg-surface-raised/80 shadow-sm animate-pulse-subtle">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-sand text-accent mb-4 shadow-sm border border-sep-line">
          <CircleNotch className="h-8 w-8 animate-spin text-accent" />
          <Sparkle className="absolute h-4 w-4 text-accent/80" />
        </div>

        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-bold text-text">
            Synthesizing Summary with Gemini 2.5 Flash
          </h3>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
        </div>

        <p className="mt-2 max-w-md font-body text-xs sm:text-sm text-text/75 leading-relaxed">
          Gemini is analyzing all uploaded workspace documents, extracting core concepts, building comparative analysis tables, and generating architectural Mermaid diagrams. This typically takes 15–30 seconds.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-ui bg-sand/80 px-3.5 py-1.5 font-mono text-[11px] text-text/70 border border-sep-line">
          <Sparkle className="h-3.5 w-3.5 text-accent animate-pulse" />
          <span>Listening to real-time platform event stream...</span>
        </div>
      </Card>
    );
  }

  if (!hasSummary) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-sep-line bg-surface">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-accent mb-4">
          <Sparkle className="h-7 w-7" />
        </div>
        <h3 className="font-display text-lg font-bold text-text">No Workspace Summary Generated</h3>
        <p className="mt-2 max-w-md text-sm text-text/60 font-sans">
          Synthesize all documents, textbooks, and notes in this workspace into a comprehensive, university-level study guide with architecture diagrams.
        </p>
        <div className="mt-6">
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || isGenerating}
            leftIcon={
              isGenerating ? (
                <CircleNotch className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <RegenerateIcon className="h-4 w-4" />
              )
            }
          >
            {isGenerating ? 'Generating Summary...' : 'Generate Summary with Gemini'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Regeneration Live Banner (if regeneration is in progress) */}
      {isGenerating && (
        <Card className="flex items-center justify-between p-4 border border-accent/40 bg-accent/5 shadow-xs">
          <div className="flex items-center gap-3">
            <CircleNotch className="h-5 w-5 animate-spin text-accent" />
            <div>
              <h4 className="font-display text-sm font-bold text-text">
                Regenerating Workspace Summary...
              </h4>
              <p className="font-body text-xs text-text/70">
                Gemini 2.5 Flash is re-synthesizing all documents. Updated sections and diagrams will refresh automatically upon completion.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] text-accent border-accent/30 bg-accent/10">
            In Progress
          </Badge>
        </Card>
      )}

      {/* Overview Card */}
      {summary.overview && (
        <Card className="border-accent/20 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-3 border-b border-sep-line pb-3">
            <div className="flex items-center gap-2 text-accent">
              <BookLinearIcon className="h-5 w-5" />
              <h2 className="font-display text-base font-bold text-text">Executive Synthesis</h2>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || generateMutation.isPending}
                leftIcon={
                  isGenerating ? (
                    <CircleNotch className="h-3.5 w-3.5 animate-spin text-accent" />
                  ) : (
                    <RegenerateIcon className="h-3.5 w-3.5" />
                  )
                }
                className="font-mono text-xs"
              >
                {isGenerating ? 'Synthesizing...' : 'Regenerate'}
              </Button>
              <Badge variant="outline" className="font-mono text-[11px] text-accent border-accent/30 bg-accent/5">
                Gemini 2.5 Flash
              </Badge>
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-text/80 leading-relaxed font-sans">
            <MarkdownRenderer content={summary.overview} />
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
                  <MarkdownRenderer content={section.content} />
                </div>
              )}

              {/* Mermaid Diagram */}
              {section.diagram && section.diagram_type !== 'none' && (
                <div className="mt-4">
                  <MermaidDiagram chart={section.diagram} caption={section.diagram_caption} />
                </div>
              )}

              {/* Code Snippet Card */}
              {section.code_snippet && (
                <SectionCodeCard
                  snippet={section.code_snippet}
                  language={section.code_language}
                  explanation={section.code_explanation}
                />
              )}

              {/* Key Takeaways */}
              {section.key_takeaways && (
                <div className="mt-4 rounded-ui bg-sand/60 border border-sep-line p-3.5 flex items-start gap-2.5">
                  <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent mb-0.5">
                      Key Takeaway
                    </p>
                    <MarkdownRenderer content={section.key_takeaways} className="text-xs text-text/80 font-sans" />
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
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-display text-base font-bold text-text">Key Mastery Takeaways</h3>
          </div>
          <ul className="space-y-2 text-sm text-text/80">
            {summary.key_takeaways.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-success font-bold mt-0.5 shrink-0">•</span>
                <div className="min-w-0 flex-1">
                  <MarkdownRenderer content={item} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default SummaryTab;
