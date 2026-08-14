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
    isLoading,
    error,
    sendQuestion,
  } = useChatSection(workspaceId);

  return (
    <ChatSectionLayout
      workspaceId={workspaceId}
      question={question}
      setQuestion={setQuestion}
      chatResponse={chatResponse}
      isLoading={isLoading}
      error={error}
      onSendQuestion={sendQuestion}
    />
  );
}
