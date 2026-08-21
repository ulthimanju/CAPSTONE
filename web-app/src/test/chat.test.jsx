import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from '@/features/chat/pages/ChatPage';
import * as chatApi from '@/features/chat/api/chatApi';
import { preprocessMarkdownForMath } from '@/components/common/MarkdownRenderer';

vi.mock('@/features/chat/api/chatApi', () => ({
  fetchWorkspaceChat: vi.fn(),
  saveWorkspaceChat: vi.fn(),
  sendRAGChatMessage: vi.fn(),
  sendRAGChatMessageStream: vi.fn(),
}));

vi.mock('@/features/workspaces/hooks/useWorkspaces', () => ({
  useWorkspaceQuery: vi.fn(() => ({ data: { id: 'ws-1', workspace_code_language: 'Java' } })),
}));

function renderWithClient(ui, initialEntries = ['/workspaces/ws-1/chat']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/workspaces/:workspaceId/chat" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AI Tutor RAG Chat Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty chat state welcome screen', async () => {
    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: [] });

    renderWithClient(<ChatPage />);

    expect(await screen.findByText('Ask Your AI Study Tutor')).toBeInTheDocument();
    expect(screen.getByText(/Interactive tutoring anchored to your uploaded notes/i)).toBeInTheDocument();
  });

  it('renders existing messages cleanly', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'What is a process context switch?',
        timestamp: '2026-08-15T10:00:00Z',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'A context switch is the mechanism of saving the state of a CPU process...',
        timestamp: '2026-08-15T10:00:05Z',
      },
    ];

    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: mockMessages });

    renderWithClient(<ChatPage />);

    expect(await screen.findByText('What is a process context switch?')).toBeInTheDocument();
    expect(screen.getByText(/A context switch is the mechanism/i)).toBeInTheDocument();
  });

  it('sends question to RAG endpoint and saves updated history', async () => {
    const user = userEvent.setup();
    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: [] });
    chatApi.sendRAGChatMessage.mockResolvedValue({
      question: 'Explain paging',
      answer: 'Paging is a memory management scheme that eliminates the need for contiguous allocation.',
    });
    chatApi.saveWorkspaceChat.mockResolvedValue({ status: 'ok' });

    renderWithClient(<ChatPage />);

    const inputElem = await screen.findByPlaceholderText(/Type a message/i);
    await user.type(inputElem, 'Explain paging');

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(chatApi.sendRAGChatMessage).toHaveBeenCalledWith('ws-1', 'Explain paging', 5, 'Java');
    });

    expect(await screen.findByText(/Paging is a memory management scheme/i)).toBeInTheDocument();
  });

  it('immediately displays the submitted query and persists it while assistant response is in-flight', async () => {
    const user = userEvent.setup();
    let resolveRAG;
    const ragPromise = new Promise((resolve) => {
      resolveRAG = resolve;
    });

    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: [] });
    chatApi.sendRAGChatMessage.mockReturnValue(ragPromise);
    chatApi.saveWorkspaceChat.mockResolvedValue({ status: 'ok' });

    renderWithClient(<ChatPage />);

    const inputElem = await screen.findByPlaceholderText(/Type a message/i);
    await user.type(inputElem, 'What is virtual memory?');

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    await user.click(sendBtn);

    // 1. User message is immediately visible in UI
    expect(screen.getByText('What is virtual memory?')).toBeInTheDocument();

    // 2. Immediate persistence call was dispatched with the user message
    expect(chatApi.saveWorkspaceChat).toHaveBeenCalledWith(
      'ws-1',
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'What is virtual memory?',
        }),
      ])
    );

    // 3. Loading state is visible
    expect(screen.getByText(/Analyzing documents & synthesizing response.../i)).toBeInTheDocument();

    // 4. Resolve the RAG response
    resolveRAG({
      question: 'What is virtual memory?',
      answer: 'Virtual memory is a memory management capability of an OS.',
    });

    expect(await screen.findByText(/Virtual memory is a memory management capability/i)).toBeInTheDocument();
    expect(screen.getByText('What is virtual memory?')).toBeInTheDocument();
  });

  it('handles RAG errors gracefully by keeping user query and showing error message', async () => {
    const user = userEvent.setup();
    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: [] });
    chatApi.sendRAGChatMessage.mockRejectedValue(new Error('Vector index unavailable'));
    chatApi.saveWorkspaceChat.mockResolvedValue({ status: 'ok' });

    renderWithClient(<ChatPage />);

    const inputElem = await screen.findByPlaceholderText(/Type a message/i);
    await user.type(inputElem, 'What is deadlock?');

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    await user.click(sendBtn);

    expect(screen.getByText('What is deadlock?')).toBeInTheDocument();

    expect(await screen.findByText('Vector index unavailable')).toBeInTheDocument();
    expect(screen.getByText('What is deadlock?')).toBeInTheDocument();
  });

  it('completes assistant response and persists history even when navigating away and back', async () => {
    const user = userEvent.setup();
    let resolveRAG;
    const ragPromise = new Promise((resolve) => {
      resolveRAG = resolve;
    });

    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: [] });
    chatApi.sendRAGChatMessage.mockReturnValue(ragPromise);
    chatApi.saveWorkspaceChat.mockResolvedValue({ status: 'ok' });

    const sharedQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { unmount } = render(
      <QueryClientProvider client={sharedQueryClient}>
        <MemoryRouter initialEntries={['/workspaces/ws-1/chat']}>
          <Routes>
            <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const inputElem = await screen.findByPlaceholderText(/Type a message/i);
    await user.type(inputElem, 'What is Single Responsibility Principle?');
    await user.click(screen.getByRole('button', { name: /Send/i }));

    expect(screen.getByText('What is Single Responsibility Principle?')).toBeInTheDocument();

    // Simulate navigating to another tab/route (unmounting ChatPage)
    unmount();

    // Resolve RAG response while unmounted
    resolveRAG({
      question: 'What is Single Responsibility Principle?',
      answer: 'The Single Responsibility Principle states that a module should have one reason to change.',
    });

    // Wait for mutation to settle
    await waitFor(() => {
      expect(chatApi.saveWorkspaceChat).toHaveBeenCalledWith(
        'ws-1',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            content: 'The Single Responsibility Principle states that a module should have one reason to change.',
          }),
        ])
      );
    });

    // Remount ChatPage (user navigating back to Chat tab)
    render(
      <QueryClientProvider client={sharedQueryClient}>
        <MemoryRouter initialEntries={['/workspaces/ws-1/chat']}>
          <Routes>
            <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('What is Single Responsibility Principle?')).toBeInTheDocument();
    expect(await screen.findByText(/The Single Responsibility Principle states that a module should have one reason to change./i)).toBeInTheDocument();
  });

  it('renders currency dollar amounts cleanly without KaTeX math corruption', () => {
    const input = "If a product's price increases from **$50** to **$60**:\n\n$$\\text{Difference} = 60 - 50 = 10$$";
    const processed = preprocessMarkdownForMath(input);
    expect(processed).toContain('**\\\\$50**');
    expect(processed).toContain('**\\\\$60**');
    expect(processed).toContain('$$\\text{Difference} = 60 - 50 = 10$$');
  });

  it('preserves valid inline LaTeX math expressions intact and renders fractions as 1/2', () => {
    const input = "For example, $50\\%$ means 50 out of 100, which simplifies to the fraction $\\frac{1}{2}$ or the decimal $0.50$, multiply by $100$ and add the $\\%$ sign.";
    const processed = preprocessMarkdownForMath(input);
    expect(processed).toContain('$50\\%$');
    expect(processed).toContain('$1/2$');
    expect(processed).toContain('$0.50$');
    expect(processed).toContain('$100$');
    expect(processed).toContain('$\\%$');
  });
});
