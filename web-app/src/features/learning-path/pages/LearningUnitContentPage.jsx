import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  Layers,
  HelpCircle,
  Code2,
  Loader2,
  Compass,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useUnitContentQuery,
  useGenerateUnitContentMutation,
  useLearningPathStore,
} from '../hooks/useLearningPath';
import { UnitSummaryView } from '../components/UnitSummaryView';
import { UnitFlashcardsView } from '../components/UnitFlashcardsView';
import { UnitQuizView } from '../components/UnitQuizView';
import { UnitProblemsView } from '../components/UnitProblemsView';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

export function LearningUnitContentPage() {
  const { workspaceId, unitTitle } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const decodedUnitTitle = decodeURIComponent(unitTitle || '');

  const activeTab = searchParams.get('tab') || 'summary';

  const isGeneratingUnit = useLearningPathStore((state) =>
    Boolean(state.generatingUnits[`${workspaceId}:${decodedUnitTitle}`])
  );

  const {
    data: unitData,
    isLoading,
  } = useUnitContentQuery(workspaceId, decodedUnitTitle);

  const generateMutation = useGenerateUnitContentMutation(workspaceId, decodedUnitTitle);

  const content = unitData?.content;
  const hasContent = Boolean(
    content && (content.summary || (content.flashcards && content.flashcards.length > 0))
  );

  const hasAutoTriggeredRef = React.useRef(false);

  const handleGenerate = () => {
    if (!workspaceId || !decodedUnitTitle || generateMutation.isPending || isGeneratingUnit) return;

    generateMutation.mutate(
      { unit_title: decodedUnitTitle },
      {
        onSuccess: () => {
          toast.success(`Unit content synthesis started with Gemini 2.5 Flash.`);
        },
        onError: (err) => {
          toast.error(err?.message || 'Failed to generate unit content.');
        },
      }
    );
  };

  React.useEffect(() => {
    if (
      !isLoading &&
      unitData &&
      !hasContent &&
      !isGeneratingUnit &&
      !generateMutation.isPending &&
      !hasAutoTriggeredRef.current
    ) {
      hasAutoTriggeredRef.current = true;
      handleGenerate();
    }
  }, [isLoading, unitData, hasContent, isGeneratingUnit, generateMutation.isPending]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    {
      id: 'summary',
      label: 'Summary',
      icon: BookOpen,
      count: null,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: Layers,
      count: content?.flashcards?.length || null,
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: HelpCircle,
      count: content?.quiz?.length || null,
    },
    {
      id: 'problems',
      label: 'Problems',
      icon: Code2,
      count: content?.problems?.length || null,
    },
  ];

  if (isLoading && !hasContent && !isGeneratingUnit) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 font-mono text-xs text-text/70">
          Loading learning unit content...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-0 flex-1">
      {/* Attached Sub-Nav Tab Bar right below Main Header */}
      <div className="sticky top-0 z-20 w-full border-b border-sep-line bg-bg px-4 sm:px-6 transition-colors">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-ui font-mono text-xs font-medium transition-all shrink-0 border',
                    isActive
                      ? 'bg-surface-raised border-sep-line text-accent font-semibold shadow-2xs'
                      : 'bg-transparent border-transparent text-text/70 hover:text-text hover:bg-surface-hover'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-accent' : 'text-text/60')} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={cn(
                        'font-mono text-[10px] px-1.5 py-0.5 rounded transition-colors',
                        isActive
                          ? 'bg-accent/10 text-accent font-bold'
                          : 'bg-sep-line/40 text-text/70'
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 w-full flex-1">
        {isGeneratingUnit || generateMutation.isPending ? (
          <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-accent/40 bg-surface-raised/80 shadow-sm animate-pulse-subtle">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-surface text-accent mb-4 shadow-sm border border-sep-line">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <Compass className="absolute h-4 w-4 text-accent/80" />
            </div>

            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-text">
                Synthesizing Unit Study Bundle
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
            </div>

            <p className="mt-2 max-w-md font-body text-xs sm:text-sm text-text/75 leading-relaxed">
              Gemini 2.5 Flash is extracting relevant document context, drafting conceptual summaries, generating architecture diagrams, flashcards, quiz questions, and curated practice problems.
            </p>

            <div className="mt-6 flex items-center gap-2 rounded-ui bg-surface-raised px-3.5 py-1.5 font-mono text-[11px] text-text/70 border border-sep-line">
              <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
              <span>Streaming live generation events...</span>
            </div>
          </Card>
        ) : !hasContent ? (
          /* Empty / Not Yet Generated State */
          <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed border-sep-line bg-surface-raised/40">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-accent mb-4 shadow-sm border border-sep-line">
              <FileText className="h-8 w-8" />
            </div>

            <h3 className="font-display text-lg font-bold text-text">
              Unit Content Not Generated Yet
            </h3>

            <p className="mt-2 max-w-md font-body text-xs sm:text-sm text-text/70 leading-relaxed">
              Synthesize this unit into a complete study bundle featuring deep notes with Mermaid diagrams, interactive flashcards, self-assessment quizzes, and verified practice problems.
            </p>

            <Button
              onClick={handleGenerate}
              isLoading={generateMutation.isPending || isGeneratingUnit}
              leftIcon={<Sparkles className="h-4 w-4 text-accent" />}
              className="mt-6 text-xs sm:text-sm"
            >
              {isGeneratingUnit || generateMutation.isPending ? 'Synthesizing Content...' : 'Generate Unit Content'}
            </Button>
          </Card>
        ) : (
          /* Active Tab Content */
          <div>
            {activeTab === 'summary' && <UnitSummaryView summary={content.summary} />}
            {activeTab === 'flashcards' && <UnitFlashcardsView flashcards={content.flashcards} />}
            {activeTab === 'quiz' && (
              <UnitQuizView
                workspaceId={workspaceId}
                unitTitle={decodedUnitTitle}
                quiz={content.quiz}
              />
            )}
            {activeTab === 'problems' && <UnitProblemsView problems={content.problems} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default LearningUnitContentPage;
