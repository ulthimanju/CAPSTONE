import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Route as RouteIcon,
  Compass,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useWorkspaceLearningPathQuery,
  useGenerateLearningPathMutation,
} from '@/features/learning-path/hooks/useLearningPath';
import { toast } from 'sonner';

export function LearningPathTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;
  const workspaceId = workspace?.id;

  const {
    data: learningPath,
    isLoading,
    isRefetching,
  } = useWorkspaceLearningPathQuery(workspaceId);

  const generateMutation = useGenerateLearningPathMutation(workspaceId);

  const handleGenerate = () => {
    if (!workspaceId || generateMutation.isPending) return;

    generateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Learning path generation started with Gemini 2.5 Flash.');
      },
      onError: (err) => {
        toast.error(err?.message || 'Failed to start learning path generation.');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 font-mono text-xs text-text/70">
          Loading workspace learning path...
        </p>
      </div>
    );
  }

  const hasPath = Boolean(
    learningPath?.units && Array.isArray(learningPath.units) && learningPath.units.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-sep-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-text">
              Learning Path
            </h2>
            <Badge variant="outline" className="font-mono text-[10px] text-accent border-accent/30 bg-accent/5">
              Adaptive Curriculum
            </Badge>
          </div>
          <p className="font-body text-xs text-text/70">
            Progressive curriculum sequenced from your uploaded notes, textbooks, and syllabus.
          </p>
        </div>

        {hasPath && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            isLoading={generateMutation.isPending}
            leftIcon={<Sparkles className="h-4 w-4 text-accent" />}
            className="text-xs border-sep-line hover:border-accent"
            title="Regenerate learning path curriculum with Gemini 2.5 Flash"
          >
            {generateMutation.isPending ? 'Synthesizing...' : 'Regenerate Path'}
          </Button>
        )}
      </div>

      {/* Empty State */}
      {!hasPath ? (
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed border-sep-line bg-surface-raised/40">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-accent mb-4 shadow-sm border border-sep-line">
            <Compass className="h-8 w-8" />
          </div>

          <h3 className="font-display text-lg font-bold text-text">
            No Learning Path Generated
          </h3>

          <p className="mt-2 max-w-md font-body text-xs sm:text-sm text-text/70 leading-relaxed">
            Generate an adaptive study sequence with milestone checkpoints, estimated topic durations, and prerequisite paths synthesized from your documents.
          </p>

          <Button
            onClick={handleGenerate}
            isLoading={generateMutation.isPending}
            leftIcon={<RouteIcon className="h-4 w-4" />}
            className="mt-6 text-xs sm:text-sm"
          >
            {generateMutation.isPending ? 'Synthesizing Path...' : 'Generate Path'}
          </Button>
        </Card>
      ) : (
        /* Generated Learning Path Display */
        <div className="space-y-6">
          {/* Curriculum Overview Banner */}
          <div className="rounded-ui border border-sep-line bg-surface-raised p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <h3 className="font-display text-base sm:text-lg font-bold text-text">
                {learningPath.title}
              </h3>
              <p className="font-body text-xs sm:text-sm text-text/80 leading-relaxed">
                {learningPath.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 rounded-ui bg-sand px-3 py-1.5 font-mono text-xs text-text border border-sep-line">
                <Layers className="h-3.5 w-3.5 text-accent" />
                <span>{learningPath.units.length} Learning Units</span>
              </div>
            </div>
          </div>

          {/* Sequenced Milestone Units Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningPath.units.map((unit, index) => (
              <Card
                key={unit.title || index}
                className="p-5 flex flex-col justify-between hover:border-accent/60 transition-all shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-sep-line/60 pb-2.5">
                    <span className="font-mono text-[11px] font-bold text-accent uppercase tracking-wider">
                      Unit {index + 1}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Milestone
                    </Badge>
                  </div>

                  <h4 className="font-display text-sm sm:text-base font-bold text-text mt-3 group-hover:text-accent transition-colors">
                    {unit.title}
                  </h4>

                  <p className="font-body text-xs text-text/75 mt-2 leading-relaxed">
                    {unit.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-sep-line/40 flex items-center justify-between font-mono text-[11px] text-text/60">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                    <span>Unit Milestone</span>
                  </span>
                  <span className="flex items-center gap-1 text-accent font-medium">
                    <span>Explore Unit</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LearningPathTab;
