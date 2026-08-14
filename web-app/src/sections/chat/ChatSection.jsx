/**
 * ChatSection — UI Composition Layer
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useChatSection } from './ChatSection.logic';
import { ChatSectionLayout } from './ChatSection.layout';

export function ChatSection({ workspaceId: propWorkspaceId }) {
  const { workspaceId: paramWorkspaceId } = useParams();
  const workspaceId = propWorkspaceId || paramWorkspaceId;

  const {
    question,
    setQuestion,
    chatResponse,
    searchResults,
    isLoading,
    error,
    sendQuestion,
    semanticSearch,
  } = useChatSection(workspaceId);

  return (
    <ChatSectionLayout
      workspaceId={workspaceId}
      question={question}
      setQuestion={setQuestion}
      chatResponse={chatResponse}
      searchResults={searchResults}
      isLoading={isLoading}
      error={error}
      onSendQuestion={sendQuestion}
      onSemanticSearch={semanticSearch}
    />
  );
}
