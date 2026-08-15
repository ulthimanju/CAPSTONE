import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Terminal, BookOpen, Lock, Globe, Users, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/constants';

export function WorkspaceHeader({ workspace, onInviteClick }) {
  const isTechnical = workspace.domain_type === 'TECHNICAL';

  return (
    <div className="border-b border-sep-line bg-surface-raised px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Back Link */}
        <div className="mb-3">
          <Link
            to={ROUTES.WORKSPACES}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-text/70 transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>All Workspaces</span>
          </Link>
        </div>

        {/* Title and Action Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {isTechnical ? (
                <Badge variant="technical">
                  <Terminal className="h-3 w-3 text-accent" aria-hidden="true" />
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

              <Badge variant="default" className="text-[10px]">
                {workspace.visibility === 'PRIVATE' && <Lock className="h-2.5 w-2.5 mr-0.5 text-text/60" />}
                {workspace.visibility === 'INTERNAL' && <Users className="h-2.5 w-2.5 mr-0.5 text-text/60" />}
                {workspace.visibility === 'PUBLIC' && <Globe className="h-2.5 w-2.5 mr-0.5 text-text/60" />}
                <span>{workspace.visibility}</span>
              </Badge>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
              {workspace.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {onInviteClick && (
              <Button
                variant="outline"
                onClick={onInviteClick}
                leftIcon={<UserPlus className="h-4 w-4" />}
                className="text-xs"
              >
                Invite Collaborator
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceHeader;
