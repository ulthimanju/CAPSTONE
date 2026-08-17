import React from 'react';
import { ArrowSquareOut, Code, Tag, Compass, Sparkle } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

export function UnitProblemsView({ problems = [] }) {
  if (!problems || problems.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-8 text-center text-text/60">
        <p className="font-mono text-xs">No practice problems recommended for this unit.</p>
      </div>
    );
  }

  const getDifficultyVariant = (difficulty = '') => {
    const d = difficulty.toLowerCase();
    if (d === 'easy') return 'success';
    if (d === 'medium') return 'warning';
    if (d === 'hard') return 'danger';
    return 'outline';
  };

  const getPlatformStyle = (platform = '') => {
    const p = platform.toLowerCase();
    if (p.includes('leetcode')) return 'bg-[#FFA116]/10 text-[#FFA116] border-[#FFA116]/30';
    if (p.includes('hackerrank')) return 'bg-[#00EA64]/10 text-[#008539] border-[#00EA64]/30';
    if (p.includes('geeks')) return 'bg-[#2F8D46]/10 text-[#2F8D46] border-[#2F8D46]/30';
    if (p.includes('codeforces')) return 'bg-[#1F8ACB]/10 text-[#1F8ACB] border-[#1F8ACB]/30';
    return 'bg-sand text-text border-sep-line';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-sep-line pb-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-accent" />
          <h3 className="font-display text-sm sm:text-base font-bold text-text">
            Recommended Practice Problems ({problems.length})
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {problems.map((problem, idx) => (
          <Card
            key={problem.title || idx}
            className="p-6 flex flex-col justify-between gap-4 border-sep-line hover:border-accent/60 transition-all shadow-xs"
          >
            <div>
              {/* Header with Title & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sep-line/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-text/50">
                    #{idx + 1}
                  </span>
                  <h4 className="font-display text-base font-bold text-text">
                    {problem.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium border',
                      getPlatformStyle(problem.platform)
                    )}
                  >
                    {problem.platform}
                  </span>
                  <Badge
                    variant={getDifficultyVariant(problem.difficulty)}
                    className="font-mono text-[10px]"
                  >
                    {problem.difficulty}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <p className="font-body text-xs sm:text-sm text-text/80 mt-3 leading-relaxed">
                {problem.description}
              </p>

              {/* Relevance */}
              {problem.relevance && (
                <div className="mt-3 rounded-ui bg-sand/60 p-3 border border-sep-line/60 font-body text-xs text-text/75">
                  <strong className="text-text font-semibold">Why this problem: </strong>
                  <span>{problem.relevance}</span>
                </div>
              )}

              {/* Concept Tags */}
              {problem.concepts && problem.concepts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {problem.concepts.map((concept, cIdx) => (
                    <span
                      key={cIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sand font-mono text-[10px] text-text/70 border border-sep-line"
                    >
                      <Tag className="h-2.5 w-2.5 text-accent" />
                      {concept}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Outbound Link Button */}
            <div className="pt-3 border-t border-sep-line/40 flex justify-end">
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-ui bg-accent px-3.5 py-1.5 font-sans text-xs font-semibold text-white shadow-xs hover:bg-accent/90 transition-colors"
              >
                <span>Solve on {problem.platform}</span>
                <ArrowSquareOut className="h-3.5 w-3.5" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default UnitProblemsView;
