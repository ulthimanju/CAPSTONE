import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Lock, Globe, Users, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CodeBoldIcon } from '@/components/ui/CodeBoldIcon';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { cn } from '@/lib/cn';

export function WorkspaceCard({ workspace, className }) {
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  const isTechnical = workspace.domain_type === 'TECHNICAL';
  const isActive = activeWorkspaceId === workspace.id;

  const formattedDate = new Date(workspace.updated_at || workspace.created_at).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  return (
    <Link
      to={`/workspaces/${workspace.id}`}
      onClick={() => setActiveWorkspaceId(workspace.id)}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-ui"
      aria-label={`Open workspace ${workspace.name}`}
    >
      <Card
        className={cn(
          'flex h-full flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-theme hover:border-accent/40',
          isActive && 'border-accent ring-1 ring-accent/30',
          className
        )}
      >
        <div>
          {/* Header row: Badges and Visibility */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {isTechnical ? (
                <Badge variant="technical">
                  <CodeBoldIcon className="h-3 w-3 text-accent" aria-hidden="true" />
                  <span>Technical</span>
                </Badge>
              ) : (
                <Badge variant="nonTechnical">
                  <BookOpen className="h-3 w-3 text-text/60" aria-hidden="true" />
                  <span>Non-Technical</span>
                </Badge>
              )}

              {workspace.user_role && (
                <Badge variant="role">
                  {workspace.user_role}
                </Badge>
              )}
            </div>

            <div className="text-text/50" title={`Visibility: ${workspace.visibility}`}>
              {workspace.visibility === 'PRIVATE' && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
              {workspace.visibility === 'PUBLIC' && <Globe className="h-3.5 w-3.5" aria-hidden="true" />}
              {workspace.visibility === 'INTERNAL' && <Users className="h-3.5 w-3.5" aria-hidden="true" />}
            </div>
          </div>

          {/* Workspace Title */}
          <h3 className="mt-4 font-display text-base font-bold text-text group-hover:text-accent transition-colors line-clamp-2">
            {workspace.name}
          </h3>
        </div>

        {/* Footer row: Date and Navigation Hint */}
        <div className="mt-6 flex items-center justify-between border-t border-sep-line/80 pt-3 text-xs text-text/60">
          <span className="font-mono text-[11px]">
            Updated {formattedDate}
          </span>
          <ArrowUpRight className="h-4 w-4 text-text/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" aria-hidden="true" />
        </div>
      </Card>
    </Link>
  );
}

export default WorkspaceCard;
