import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Loader2,
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
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { toast } from 'sonner';

const SUGGESTED_PROMPTS = [
  'Explain the difference between Monolithic and Microkernel architectures.',
  'What are the necessary conditions for a Deadlock to occur?',
  'How does Demand Paging with virtual memory work?',
  'Compare Preemptive and Non-Preemptive CPU Scheduling algorithms.',
];

export function ChatPage() {
  const { workspaceId } = useParams();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const { data: chatData, isLoading: isChatLoading } = useWorkspaceChatQuery(workspaceId);
  const saveChatMutation = useSaveWorkspaceChatMutation(workspaceId);
  const sendMutation = useSendRAGMessageMutation(workspaceId);

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
    if (messages.length === 0) return;
    setMessages([]);
    saveChatMutation.mutate([]);
    toast.success('Chat history cleared');
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Answer copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isChatLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="font-mono text-sm text-text/60">Loading tutor chat session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-sep-line pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-ui bg-sand text-accent">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-text">AI Study Tutor</h2>
              <Badge variant="outline" className="font-mono text-[10px] text-accent border-accent/30 bg-accent/5">
                RAG Grounded
              </Badge>
            </div>
            <p className="text-xs text-text/60 font-sans">
              Ask questions and get answers synthesized directly from your workspace documents.
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-xs text-text/60 hover:text-danger hover:border-danger/30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Chat</span>
          </Button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-accent mb-4 shadow-sm">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-text">Ask Your AI Study Tutor</h3>
            <p className="mt-1.5 max-w-md text-xs sm:text-sm text-text/60 font-sans">
              Interactive tutoring anchored to your uploaded notes, slides, and textbooks. Choose a topic below or type your own question.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl text-left">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
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
                  {isUser ? (
                    <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none font-sans leading-relaxed text-text/85">
                      <MarkdownRenderer content={msg.content} />
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-text mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {sendMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Bot className="h-4 w-4 animate-pulse" />
            </div>
            <div className="rounded-ui rounded-tl-none border border-sep-line bg-surface p-4 shadow-sm flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="font-mono text-xs text-text/60">Searching workspace documents & synthesizing response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="border-t border-sep-line pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-end gap-2 rounded-ui border border-sep-line bg-surface p-2 shadow-sm focus-within:border-accent"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this workspace (Shift+Enter for new line)..."
            rows={2}
            disabled={sendMutation.isPending}
            className="w-full resize-none bg-transparent p-1.5 font-sans text-xs sm:text-sm text-text placeholder:text-text/40 focus:outline-none disabled:opacity-50"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || sendMutation.isPending}
            className="flex items-center gap-1.5 shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ChatPage;
