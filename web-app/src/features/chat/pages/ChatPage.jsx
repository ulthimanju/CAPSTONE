import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Send,
  Sparkles,
  RotateCcw,
  Loader2,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
    toast.success('Copied to clipboard');
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

  // Group messages by date for date dividers
  const todayFormatted = formatMessageDate(new Date().toISOString());

  return (
    <div className="flex flex-col h-full w-full bg-[#f5efe3] min-h-0 flex-1">
      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 space-y-5 min-h-0">
        {/* Date Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-[#cfc5ae]" />
          <span className="px-4 font-mono text-[11px] font-medium tracking-widest text-[#7a715d] uppercase">
            {messages.length > 0 ? formatMessageDate(messages[0].timestamp) : todayFormatted}
          </span>
          <div className="flex-1 border-t border-[#cfc5ae]" />
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dfd7c2] text-accent mb-3 shadow-sm border border-[#cfc5ae]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-display text-base font-bold text-[#2c271e]">Ask Your AI Study Tutor</h3>
            <p className="mt-1 max-w-md text-xs text-[#7a715d] font-sans">
              Interactive tutoring anchored to your uploaded notes, slides, and textbooks. Choose a topic below or type your own question.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="rounded-md border border-[#cfc5ae] bg-[#dfd7c2]/60 p-3 text-xs text-[#2c271e] transition-all hover:bg-[#dfd7c2] hover:border-accent shadow-xs flex items-start gap-2"
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
            const timeStr = formatMessageTime(msg.timestamp);

            return (
              <div
                key={msg.id || index}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {isUser ? (
                  /* User Bubble (Right - Rust/Terracotta) */
                  <div className="relative group max-w-[80%] sm:max-w-[70%] rounded-md bg-[#9E5123] border border-[#88431b] p-3.5 text-white shadow-xs">
                    <p className="text-sm font-sans leading-relaxed text-white whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <div className="mt-1 text-right font-mono text-[10px] text-white/70">
                      {timeStr}
                    </div>
                  </div>
                ) : (
                  /* Assistant Bubble (Left - Sand/Parchment) */
                  <div className="relative group max-w-[85%] sm:max-w-[75%] rounded-md bg-[#dfd7c2] border border-[#c4ba9f] p-3.5 text-[#2c271e] shadow-xs">
                    <div className="text-sm font-sans leading-relaxed text-[#2c271e]">
                      <MarkdownRenderer content={msg.content} />
                    </div>

                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[#7a715d] border-t border-[#cfc5ae]/40 pt-1.5">
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

        {sendMutation.isPending && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-md bg-[#dfd7c2] border border-[#c4ba9f] p-3.5 shadow-xs flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="font-mono text-xs text-[#7a715d]">
                Analyzing documents & synthesizing response...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Docked Bottom Input Bar */}
      <div className="border-t border-[#cfc5ae] bg-[#e6ddc8] px-4 sm:px-8 lg:px-12 py-3.5 w-full">
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
            disabled={sendMutation.isPending}
            className="flex-1 rounded-md border border-[#cfc5ae] bg-[#f7f5ed] px-4 py-2.5 font-sans text-xs sm:text-sm text-[#2c271e] placeholder:text-[#8a8069] focus:outline-none focus:border-[#9E5123] disabled:opacity-50 shadow-inner-xs transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMutation.isPending}
            className="flex items-center justify-center rounded-md bg-[#9E5123] px-6 py-2.5 font-sans text-xs sm:text-sm font-medium text-white shadow-xs transition-all hover:bg-[#88431b] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
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
