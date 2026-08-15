import React from 'react';
import { BookOpen, Lightbulb, CheckCircle2, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { MermaidDiagram } from '@/features/summary/components/MermaidDiagram';

export function UnitSummaryView({ summary }) {
  if (!summary) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-8 text-center text-text/60">
        <p className="font-mono text-xs">No summary content available for this unit.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      {summary.overview && (
        <Card className="border-accent/20 bg-surface p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-3 border-b border-sep-line pb-3">
            <div className="flex items-center gap-2 text-accent">
              <BookOpen className="h-5 w-5" />
              <h3 className="font-display text-base font-bold text-text">
                Unit Overview
              </h3>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] text-accent border-accent/30 bg-accent/5">
              Core Concept
            </Badge>
          </div>
          <div className="prose prose-sm max-w-none text-text/80 leading-relaxed font-sans">
            <MarkdownRenderer content={summary.overview} />
          </div>
        </Card>
      )}

      {/* Structured Sections & Mermaid Architecture */}
      {summary.sections && summary.sections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-text">
            <FileText className="h-4 w-4 text-accent" />
            <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-text/90">
              Detailed Modules & Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {summary.sections.map((section, idx) => (
              <Card key={section.id || idx} className="p-6 shadow-xs">
                <h4 className="font-display text-base font-bold text-text mb-3 border-b border-sep-line/60 pb-2">
                  {section.title}
                </h4>

                <div className="prose prose-sm max-w-none text-text/80 leading-relaxed font-sans mb-4">
                  <MarkdownRenderer content={section.content} />
                </div>

                {section.diagram && (
                  <MermaidDiagram
                    chart={section.diagram}
                    caption={section.diagram_caption}
                  />
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Key Takeaways */}
      {summary.key_takeaways && summary.key_takeaways.length > 0 && (
        <Card className="border-sep-line bg-surface-raised/40 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 text-accent">
            <Lightbulb className="h-5 w-5" />
            <h3 className="font-display text-base font-bold text-text">
              Key Revision Takeaways
            </h3>
          </div>

          <ul className="space-y-2.5">
            {summary.key_takeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2.5 font-body text-xs sm:text-sm text-text/80 leading-relaxed">
                <CheckCircle2 className="h-4 w-4 text-sage shrink-0 mt-0.5" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default UnitSummaryView;
