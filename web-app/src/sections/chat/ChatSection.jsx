/**
 * ChatSection — UI Composition Layer
 *
 * Connects useChatSection hook to ChatSectionLayout.
 */

import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';

export function ChatHeaderActions({ workspaceId }) {
  const { chatResponse, searchResults } = useChatSection(workspaceId);
  const payloadToCopy = chatResponse || searchResults || null;

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <CopyPayloadButton payload={payloadToCopy} />
    </div>
  );
}

export function ChatSection({ workspaceId }) {
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
