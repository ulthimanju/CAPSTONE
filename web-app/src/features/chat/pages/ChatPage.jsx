import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Loader2,
  BookOpen,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useWorkspaceChatQuery,
  useSaveWorkspaceChatMutation,
  useSendRAGMessageMutation,
} from '../hooks/useChat';
import { CitationBadge } from '../components/CitationBadge';
import { MermaidDiagram } from '@/features/summary/components/MermaidDiagram';
import { toast } from 'sonner';

const markdownComponents = {
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-ui border border-sep-line bg-surface shadow-sm">
      <table className="min-w-full divide-y divide-sep-line text-left font-sans text-xs sm:text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="bg-sand/60 font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text/80" {...props} />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="divide-y divide-sep-line bg-surface" {...props} />
  ),
  tr: ({ node, ...props }) => (
    <tr className="hover:bg-surface-hover/50 transition-colors" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th className="px-3.5 py-2.5 align-top font-bold text-text border-r border-sep-line last:border-r-0" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="px-3.5 py-2.5 align-top text-text/80 border-r border-sep-line last:border-r-0 leading-normal" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed" {...props} />
  ),
  code: ({ node, className, children, ...props }) => {
    const isMultiLine = typeof children === 'string' && children.includes('\n');
    const hasLanguage = Boolean(className && /language-/.test(className));
    const isBlockCode = hasLanguage || isMultiLine;
    const match = /language-(\w+)/.exec(className || '');

    if (match && match[1] === 'mermaid') {
      return (
        <div className="my-3">
          <MermaidDiagram chart={String(children).trim()} />
        </div>
      );
    }

    if (!isBlockCode) {
      return (
        <code
          className="rounded bg-sand/70 px-1.5 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-accent border border-sep-line/40 inline align-baseline"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className="my-3 overflow-x-auto rounded-ui border border-sep-line bg-sand/30 p-3 font-mono text-xs text-text shadow-sm">
        <code className="block leading-relaxed" {...props}>
          {children}
        </code>
      </div>
    );
  },
};

const SUGGESTED_PROMPTS = [
  'Explain the difference between Monolithic and Microkernel OS architectures.',
  'What happens step-by-step during a Page Fault trap?',
  'Compare Windows API vs Linux POSIX system calls for Process Control.',
  'How does Round Robin scheduling calculate average waiting time?',
];

export function ChatPage() {
  const { workspaceId } = useParams();
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const { data: chatData, isLoading: isLoadingChat } = useWorkspaceChatQuery(workspaceId);
  const saveChatMutation = useSaveWorkspaceChatMutation(workspaceId);
  const sendMutation = useSendRAGMessageMutation(workspaceId);

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (chatData?.messages) {
      setMessages(chatData.messages);
    }
  }, [chatData]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sendMutation.isPending]);

  const handleSend = (textToSend) => {
    const question = (textToSend || input).trim();
    if (!question || sendMutation.isPending) return;

    const userMessage = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    sendMutation.mutate(
      { question, topK: 5 },
      {
        onSuccess: (data) => {
          const assistantMessage = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
            role: 'assistant',
            content: data.answer,
            citations: data.citations || [],
            timestamp: new Date().toISOString(),
          };
          const updated = [...newMessages, assistantMessage];
          setMessages(updated);
          saveChatMutation.mutate(updated);
        },
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear this workspace conversation history?')) {
      setMessages([]);
      saveChatMutation.mutate([]);
      toast.success('Chat history cleared');
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isLoadingChat) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="font-mono text-sm text-text/60">Loading conversational history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-sep-line pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold text-text">AI Workspace Tutor</h1>
              <Badge variant="outline" className="font-mono text-[10px] text-accent border-accent/30 bg-accent/5">
                Vector Grounded
              </Badge>
            </div>
            <p className="font-mono text-xs text-text/60">
              Interactive tutoring anchored to your uploaded notes & textbooks
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-xs text-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Chat</span>
          </Button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-accent mb-4">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="font-display text-lg font-bold text-text">Ask Your AI Study Tutor</h3>
            <p className="mt-1 max-w-md text-sm text-text/60 font-sans">
              Ask deep conceptual questions, request algorithm step-by-step breakdowns, or generate sample practice problems grounded in this workspace.
            </p>

            {/* Suggested Prompts */}
            <div className="mt-6 grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="rounded-ui border border-sep-line bg-surface p-3 text-xs text-text/80 transition-all hover:border-accent hover:bg-sand/40 hover:text-text shadow-sm flex items-start gap-2"
                >
                  <HelpCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="leading-snug">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-ui p-4 shadow-sm ${
                    isUser
                      ? 'bg-accent text-white rounded-tr-none'
                      : 'bg-surface border border-sep-line text-text rounded-tl-none'
                  }`}
                >
                  {/* Message Content */}
                  <div
                    className={`prose prose-sm max-w-none font-sans leading-relaxed ${
                      isUser ? 'text-white prose-invert' : 'text-text/85'
                    }`}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={markdownComponents}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Grounding Source Citations */}
                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3.5 border-t border-sep-line/60 pt-2.5">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-text/60 uppercase tracking-wider mb-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-accent" />
                        <span>Grounding Sources ({msg.citations.length})</span>
                      </div>
                      <div className="flex flex-wrap items-center">
                        {msg.citations.map((citation, citIdx) => (
                          <CitationBadge key={citIdx} citation={citation} index={citIdx} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions & Timestamp */}
                  {!isUser && (
                    <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-text/40 pt-1">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-accent mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Thinking / Streaming Indicator */}
        {sendMutation.isPending && (
          <div className="flex gap-3 justify-start items-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-ui rounded-tl-none border border-accent/30 bg-accent/5 p-4 shadow-sm flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <p className="font-mono text-xs text-text/70">
                Searching vector indices and synthesizing grounded response...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <Card className="p-2.5 bg-surface border-sep-line shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this workspace (e.g. formulas, concept comparisons, practice problems)..."
            rows={1}
            disabled={sendMutation.isPending}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm font-sans text-text placeholder:text-text/40 focus:outline-none max-h-32"
          />

          <Button
            type="submit"
            disabled={!input.trim() || sendMutation.isPending}
            className="h-10 px-4 flex items-center gap-2"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default ChatPage;
