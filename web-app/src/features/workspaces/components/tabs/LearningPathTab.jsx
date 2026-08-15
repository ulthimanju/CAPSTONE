import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Route as RouteIcon, Sparkles, Compass, CheckCircle2, Clock, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

export function LearningPathTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;

  const [isGenerating, setIsGenerating] = useState(false);
  const [learningPath, setLearningPath] = useState(null);

  const handleGeneratePath = () => {
    setIsGenerating(true);
    toast.info('Synthesizing learning path from workspace syllabus & documents...');
    
    // Simulate generation or prepare for backend integration
    setTimeout(() => {
      setIsGenerating(false);
      toast.success('Learning path generated successfully!');
      setLearningPath({
        title: `${workspace?.name || 'Course'} Adaptive Learning Journey`,
        description: 'Structured mastery milestones sequenced from introductory foundations to advanced synthesis.',
        estimated_hours: 24,
        milestones: [
          {
            id: 'm1',
            title: 'Foundations & Architectural Core',
            description: 'Core design principles, structural abstractions, and execution pipelines.',
            duration: '4 Hours',
            topics: ['Architectural Overview', 'Kernel Abstractions', 'Process Life Cycles'],
            status: 'IN_PROGRESS',
          },
          {
            id: 'm2',
            title: 'Memory & Concurrency Management',
            description: 'Demand paging, virtual addressing, synchronization primitives, and deadlocks.',
            duration: '8 Hours',
            topics: ['Virtual Memory & Paging', 'Semaphores & Mutexes', 'Banker Algorithm'],
            status: 'UPCOMING',
          },
          {
            id: 'm3',
            title: 'Storage Systems & Device I/O',
            description: 'File system layouts, caching mechanics, and disk scheduling algorithms.',
            duration: '6 Hours',
            topics: ['Indexed Allocation', 'RAID Architectures', 'I/O Scheduling'],
            status: 'UPCOMING',
          },
          {
            id: 'm4',
            title: 'Advanced Topics & Practice Synthesis',
            description: 'Comprehensive problem solving, past exam patterns, and conceptual defense.',
            duration: '6 Hours',
            topics: ['Distributed Coordination', 'Security & Access Control', 'Final Review'],
            status: 'UPCOMING',
          },
        ],
      });
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-sep-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-text">
              Learning Path
            </h2>
            <Badge variant="outline" className="font-mono text-[10px] text-accent border-accent/30 bg-accent/5">
              Adaptive
            </Badge>
          </div>
          <p className="font-body text-xs text-text/70">
            Personalized milestone-by-milestone curriculum sequenced directly from your uploaded materials.
          </p>
        </div>

        {learningPath && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePath}
            isLoading={isGenerating}
            leftIcon={<Sparkles className="h-4 w-4 text-accent" />}
            className="text-xs border-sep-line hover:border-accent"
          >
            Regenerate Path
          </Button>
        )}
      </div>

      {/* Empty State */}
      {!learningPath ? (
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
            onClick={handleGeneratePath}
            isLoading={isGenerating}
            leftIcon={<RouteIcon className="h-4 w-4" />}
            className="mt-6 text-xs sm:text-sm"
          >
            {isGenerating ? 'Synthesizing Path...' : 'Generate Path'}
          </Button>
        </Card>
      ) : (
        /* Generated Learning Path Milestones */
        <div className="space-y-6">
          <div className="rounded-ui border border-sep-line bg-surface-raised p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-text">
                {learningPath.title}
              </h3>
              <p className="font-body text-xs text-text/70 mt-0.5">
                {learningPath.description}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 rounded-ui bg-sand px-3 py-1.5 font-mono text-xs text-text border border-sep-line">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span>{learningPath.estimated_hours} Hours Total</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-ui bg-sand px-3 py-1.5 font-mono text-xs text-text border border-sep-line">
                <BookOpen className="h-3.5 w-3.5 text-sage" />
                <span>{learningPath.milestones.length} Milestones</span>
              </div>
            </div>
          </div>

          {/* Timeline Milestones */}
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-sep-line">
            {learningPath.milestones.map((milestone, idx) => (
              <div key={milestone.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-6 sm:-left-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-sand border-2 border-accent text-accent">
                  <span className="font-mono text-[10px] font-bold">{idx + 1}</span>
                </div>

                <Card className="p-4 sm:p-5 hover:border-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-sep-line/60 pb-3">
                    <div>
                      <span className="font-mono text-[10px] font-semibold text-accent uppercase tracking-wider">
                        Milestone {idx + 1}
                      </span>
                      <h4 className="font-display text-base font-bold text-text mt-0.5">
                        {milestone.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text/60">{milestone.duration}</span>
                      <Badge variant={milestone.status === 'IN_PROGRESS' ? 'role' : 'outline'}>
                        {milestone.status === 'IN_PROGRESS' ? 'In Progress' : 'Upcoming'}
                      </Badge>
                    </div>
                  </div>

                  <p className="font-body text-xs text-text/80 mt-3 leading-relaxed">
                    {milestone.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {milestone.topics.map((topic, tidx) => (
                      <span
                        key={tidx}
                        className="inline-flex items-center gap-1.5 rounded-ui bg-sand/60 px-2.5 py-1 font-mono text-[11px] text-text border border-sep-line/50"
                      >
                        <CheckCircle2 className="h-3 w-3 text-sage" />
                        <span>{topic}</span>
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LearningPathTab;
