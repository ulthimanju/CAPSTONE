import React, { useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { Archive, MessageSquare, Clock, ArrowRight, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function ArchivedChatsPage() {
  const { workspaceId } = useParams();
  const context = useOutletContext() || {};
  const workspace = context.workspace;

  const [archivedChats, setArchivedChats] = useState([]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sep-line pb-5">
        <div>
          <h1 className="font-display text-xl font-bold text-text">Archived Chats</h1>
          <p className="mt-1 font-body text-xs text-text/70">
            Previous AI tutoring conversations and past question sessions saved from this workspace.
          </p>
        </div>

        {workspaceId && (
          <Link to={`/workspaces/${workspaceId}/chat`}>
            <Button size="sm" leftIcon={<MessageSquare className="h-3.5 w-3.5" />} className="text-xs">
              Go to Active Chat
            </Button>
          </Link>
        )}
      </div>

      {/* Archived Chats List or Empty State */}
      {archivedChats.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-sep-line py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
            <Archive className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-text">
            No archived chats
          </h3>
          <p className="mt-1 max-w-sm font-body text-xs text-text/70 leading-relaxed">
            When you clear or archive past AI tutor conversation sessions, they will be preserved here for review.
          </p>
          {workspaceId && (
            <Link to={`/workspaces/${workspaceId}/chat`} className="mt-5">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} className="text-xs">
                Start a New Chat Session
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {archivedChats.map((chat) => (
            <Card
              key={chat.id}
              className="p-4 flex items-center justify-between gap-4 border border-sep-line bg-surface hover:border-accent shadow-xs"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text">{chat.title}</h4>
                  <p className="mt-0.5 text-xs text-text/70 line-clamp-1">{chat.preview}</p>
                  <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-text/50">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(chat.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} className="text-xs">
                Restore
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ArchivedChatsPage;
