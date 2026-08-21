import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkle,
  CircleNotch,
  Copy,
  Check,
  Lightbulb,
  CheckCircle,
} from '@/components/ui/icons';
import { BookLinearIcon } from '@/components/ui';
import {
  useWorkspaceChatQuery,
  useSendRAGMessageMutation,
  useIsRAGPending,
} from '../hooks/useChat';
import { useWorkspaceQuery } from '@/features/workspaces/hooks/useWorkspaces';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { MermaidDiagram } from '@/features/summary/components/MermaidDiagram';
import { SectionCodeCard } from '@/features/summary/pages/SummaryTab';
import { toast } from 'sonner';

function getStructuredPayload(content) {
  if (!content) return null;

  // Case A: Already a parsed JS object
  if (typeof content === 'object' && content !== null) {
    if (Array.isArray(content.sections) && content.sections.length > 0) {
      // Check for nested raw JSON string inside single fallback section
      const firstContent = content.sections[0]?.content;
      if (
        content.sections.length === 1 &&
        typeof firstContent === 'string' &&
        firstContent.trim().startsWith('{') &&
        firstContent.includes('"sections"')
      ) {
        const nested = getStructuredPayload(firstContent);
        if (nested) return nested;
      }
      return content;
    }
    if (content.overview || Array.isArray(content.key_takeaways)) {
      return content;
    }
  }

  // Case B: String containing JSON
  if (typeof content === 'string') {
    let clean = content.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    if (clean.startsWith('{') && (clean.includes('"sections"') || clean.includes('"overview"'))) {
      // 1. Direct standard parse
      try {
        const parsed = JSON.parse(clean);
        if (parsed && (Array.isArray(parsed.sections) || parsed.overview || Array.isArray(parsed.key_takeaways))) {
          return parsed;
        }
      } catch {
        // 2. Repair LaTeX single backslashes (e.g. \text -> \\text, \times -> \\times)
        try {
          const repaired = clean.replace(/(?<!\\)\\(?![/u"bfnrt\\])/g, '\\\\');
          const parsed = JSON.parse(repaired);
          if (parsed && (Array.isArray(parsed.sections) || parsed.overview || Array.isArray(parsed.key_takeaways))) {
            return parsed;
          }
        } catch {
          // 3. Fallback regex field extractor
          try {
            const sections = [];
            const blockMatches = clean.matchAll(/\{\s*"id":\s*"([^"]*)",\s*"title":\s*"([^"]*)",\s*"content":\s*"([\s\S]*?)"(?:\s*,\s*"diagram"|\s*,\s*"code_snippet"|\s*\})/g);
            for (const match of blockMatches) {
              const secId = match[1];
              const secTitle = match[2];
              const secContent = match[3]
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"');
              sections.push({
                id: secId || `sec-${sections.length + 1}`,
                title: secTitle || 'Key Concept',
                content: secContent,
              });
            }
            if (sections.length > 0) {
              return { sections };
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return null;
}

function getCopyableText(content) {
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    const parts = [];
    if (content.overview) parts.push(content.overview);
    if (Array.isArray(content.sections)) {
      content.sections.forEach((sec) => {
        if (sec.title) parts.push(`## ${sec.title}`);
        if (sec.content) parts.push(sec.content);
        if (sec.diagram) parts.push(`\`\`\`mermaid\n${sec.diagram}\n\`\`\``);
        if (sec.code_snippet) parts.push(`\`\`\`${sec.code_language || ''}\n${sec.code_snippet}\n\`\`\``);
        if (sec.key_takeaways) parts.push(`> **Key Takeaway:** ${sec.key_takeaways}`);
      });
    }
    if (Array.isArray(content.key_takeaways)) {
      parts.push('### Key Takeaways:\n' + content.key_takeaways.map((t) => `- ${t}`).join('\n'));
    }
    return parts.filter(Boolean).join('\n\n');
  }
  return String(content || '');
}

function formatMessageDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function ChatPage() {
  const { workspaceId } = useParams();
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const { data: chatData, isLoading: isChatLoading } = useWorkspaceChatQuery(workspaceId);
  const { data: workspace } = useWorkspaceQuery(workspaceId);
  const sendMutation = useSendRAGMessageMutation(workspaceId);
  const isRAGPending = useIsRAGPending(workspaceId) || sendMutation.isPending;

  const messages = useMemo(() => (Array.isArray(chatData?.messages) ? chatData.messages : []), [chatData?.messages]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isRAGPending]);

  const handleSend = (textToSend) => {
    const question = (textToSend || input).trim();
    if (!question || isRAGPending) return;

    setInput('');
    sendMutation.mutate({
      question,
      topK: 5,
      workspaceCodeLanguage: workspace?.workspace_code_language || null,
      domainType: workspace?.domain_type || null,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content, idx) => {
    const textToCopy = getCopyableText(content);
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(idx);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isChatLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <CircleNotch className="h-8 w-8 animate-spin text-accent" />
          <p className="font-mono text-sm text-text/60">Loading tutor chat session...</p>
        </div>
      </div>
    );
  }

  // Group messages by date for date dividers
  const todayFormatted = formatMessageDate(new Date().toISOString());

  return (
    <div className="flex flex-col h-full w-full bg-bg min-h-0 flex-1">
      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-8 lg:px-12 py-6 space-y-5 min-h-0">
        {/* Date Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-sep-line" />
          <span className="px-4 font-mono text-[11px] font-medium tracking-widest text-text/60 uppercase">
            {messages.length > 0 ? formatMessageDate(messages[0].timestamp) : todayFormatted}
          </span>
          <div className="flex-1 border-t border-sep-line" />
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-accent mb-3 shadow-sm border border-sep-line">
              <Sparkle className="h-6 w-6" />
            </div>
            <h3 className="font-display text-base font-bold text-text">Ask Your AI Study Tutor</h3>
            <p className="mt-1 max-w-md text-xs text-text/70 font-sans">
              Interactive tutoring anchored to your uploaded notes, slides, and textbooks. Type your question below to start learning.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const timeStr = formatMessageTime(msg.timestamp);

            return (
              <div
                key={msg.id || index}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {isUser ? (
                  /* User Bubble (Right - Rust Gradient) */
                  <div className="relative group max-w-[80%] sm:max-w-[70%] rounded-ui bg-gradient-rust border border-accent/40 p-3.5 text-on-accent shadow-xs">
                    <p className="text-sm font-sans leading-relaxed text-on-accent whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <div className="mt-1 text-right font-mono text-[10px] text-on-accent/80">
                      {timeStr}
                    </div>
                  </div>
                ) : (
                  /* Assistant Bubble (Left - Sand/Parchment) */
                  <div className="relative group max-w-[85%] sm:max-w-[75%] rounded-ui bg-sand border border-sep-line p-3.5 text-text shadow-xs">
                    {(() => {
                      const payload = getStructuredPayload(msg.content);
                      if (payload && (payload.overview || (payload.sections && payload.sections.length > 0) || (payload.key_takeaways && payload.key_takeaways.length > 0))) {
                        return (
                          <div className="space-y-4">
                            {/* Executive Overview / Synthesis if present */}
                            {payload.overview && (
                              <div className="rounded-ui bg-surface/70 border border-sep-line/70 p-3.5 shadow-2xs">
                                <div className="flex items-center gap-1.5 text-accent mb-2 pb-1.5 border-b border-sep-line/60 font-display text-xs font-bold">
                                  <BookLinearIcon className="h-4 w-4" />
                                  <span>Overview</span>
                                </div>
                                <div className="text-sm font-sans leading-relaxed text-text/90">
                                  <MarkdownRenderer content={payload.overview} />
                                </div>
                              </div>
                            )}

                            {/* Structured Sections */}
                            {payload.sections && payload.sections.length > 0 && (
                              <div className="space-y-3.5">
                                {payload.sections.map((section, secIdx) => {
                                  const hasTitle = Boolean(section.title && section.title.trim() && section.title.toLowerCase() !== 'response');
                                  const showCardWrapper = hasTitle || payload.sections.length > 1;
                                  return (
                                    <div key={section.id || secIdx} className={showCardWrapper ? "space-y-2.5 rounded-ui bg-surface/40 border border-sep-line/50 p-3" : "space-y-2.5"}>
                                      {hasTitle && (
                                        <h4 className="font-display text-sm font-bold text-text border-b border-sep-line/60 pb-1.5 flex items-center gap-2">
                                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-[11px] font-bold text-accent border border-sep-line">
                                            {secIdx + 1}
                                          </span>
                                          <span>{section.title}</span>
                                        </h4>
                                      )}

                                      {section.content && (
                                        <div className="text-sm font-sans leading-relaxed text-text">
                                          <MarkdownRenderer content={section.content} />
                                        </div>
                                      )}

                                    {section.diagram && section.diagram_type !== 'none' && (
                                      <div className="mt-2.5">
                                        <MermaidDiagram chart={section.diagram} caption={section.diagram_caption} />
                                      </div>
                                    )}

                                    {section.code_snippet && (
                                      <SectionCodeCard
                                        snippet={section.code_snippet}
                                        language={section.code_language}
                                        explanation={section.code_explanation}
                                      />
                                    )}

                                    {section.key_takeaways && (
                                      <div className="mt-2.5 rounded-ui bg-sand/80 border border-sep-line p-2.5 flex items-start gap-2">
                                        <Lightbulb className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent mb-0.5">
                                            Key Takeaway
                                          </p>
                                          <MarkdownRenderer content={section.key_takeaways} className="text-xs text-text/80 font-sans" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            )}

                            {/* Summary-Level Key Takeaways */}
                            {payload.key_takeaways && payload.key_takeaways.length > 0 && (
                              <div className="rounded-ui bg-surface border border-success/30 p-3 shadow-2xs">
                                <div className="flex items-center gap-1.5 text-success mb-2 font-display text-xs font-bold">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Key Mastery Takeaways</span>
                                </div>
                                <ul className="space-y-1.5 text-xs text-text/85">
                                  {payload.key_takeaways.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0 mt-1.5" />
                                      <span className="leading-relaxed">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="text-sm font-sans leading-relaxed text-text">
                          <MarkdownRenderer content={typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)} />
                        </div>
                      );
                    })()}

                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-text/60 border-t border-sep-line/60 pt-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, index)}
                        className="flex items-center gap-1 hover:text-accent transition-colors"
                        title="Copy answer"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-3 w-3 text-success" />
                            <span className="text-success">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <span>{timeStr}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {isRAGPending && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-ui bg-sand border border-sep-line p-3.5 shadow-xs flex items-center gap-3">
              <CircleNotch className="h-4 w-4 animate-spin text-accent" />
              <span className="font-mono text-xs text-text/70">
                Analyzing documents & synthesizing response...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Docked Bottom Input Bar */}
      <div className="border-t border-sep-line bg-surface-raised px-4 sm:px-8 lg:px-12 py-3.5 w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3 w-full"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isRAGPending}
            className="flex-1 rounded-ui border border-sep-line bg-bg px-4 py-2.5 font-sans text-xs sm:text-sm text-text placeholder:text-text/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 shadow-none transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isRAGPending}
            className="flex items-center justify-center rounded-ui bg-gradient-rust hover:bg-gradient-rust-hover px-6 py-2.5 font-sans text-xs sm:text-sm font-medium text-on-accent transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-none"
          >
            {isRAGPending ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatPage;
