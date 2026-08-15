import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Route as RouteIcon,
  Compass,
  Sparkles,
  Layers,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useWorkspaceLearningPathQuery,
  useGenerateLearningPathMutation,
  useLearningPathStore,
} from '@/features/learning-path/hooks/useLearningPath';
import { toast } from 'sonner';

export function LearningPathTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;
  const workspaceId = workspace?.id;

  const isGenerating = useLearningPathStore((state) =>
    Boolean(state.generatingWorkspaces[workspaceId])
  );

  const {
    data: learningPath,
    isLoading,
    isRefetching,
  } = useWorkspaceLearningPathQuery(workspaceId);

  const generateMutation = useGenerateLearningPathMutation(workspaceId);

  const handleGenerate = () => {
    if (!workspaceId || generateMutation.isPending || isGenerating) return;

    generateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Learning path synthesis started with Gemini 2.5 Flash.');
      },
      onError: (err) => {
        toast.error(err?.message || 'Failed to start learning path generation.');
      },
    });
  };

  const hasPath = Boolean(
    learningPath?.units && Array.isArray(learningPath.units) && learningPath.units.length > 0
  );

  if (isLoading && !hasPath && !isGenerating) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 font-mono text-xs text-text/70">
          Loading workspace learning path...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generating Active State */}
      {isGenerating ? (
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-accent/40 bg-surface-raised/80 shadow-sm animate-pulse-subtle">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-sand text-accent mb-4 shadow-sm border border-sep-line">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <Compass className="absolute h-4 w-4 text-accent/80" />
          </div>

          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold text-text">
              Synthesizing Adaptive Learning Path
            </h3>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          </div>

          <p className="mt-2 max-w-md font-body text-xs sm:text-sm text-text/75 leading-relaxed">
            Gemini 2.5 Flash is analyzing your document hierarchy, outline structure, and topic prerequisites. The sequenced milestones will automatically appear below.
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-ui bg-sand/80 px-3.5 py-1.5 font-mono text-[11px] text-text/70 border border-sep-line">
            <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
            <span>Listening to real-time platform event stream...</span>
          </div>
        </Card>
      ) : !hasPath ? (
        /* Empty State */
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
            isLoading={generateMutation.isPending || isGenerating}
            leftIcon={<RouteIcon className="h-4 w-4" />}
            className="mt-6 text-xs sm:text-sm"
          >
            {isGenerating || generateMutation.isPending ? 'Synthesizing Path...' : 'Generate Path'}
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
                  <div className="border-b border-sep-line/60 pb-2.5">
                    <span className="font-mono text-[11px] font-bold text-accent uppercase tracking-wider">
                      Unit {index + 1}
                    </span>
                  </div>

                  <h4 className="font-display text-sm sm:text-base font-bold text-text mt-3 group-hover:text-accent transition-colors">
                    {unit.title}
                  </h4>

                  <p className="font-body text-xs text-text/75 mt-2 leading-relaxed">
                    {unit.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-sep-line/40 flex items-center justify-end font-mono text-[11px]">
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
