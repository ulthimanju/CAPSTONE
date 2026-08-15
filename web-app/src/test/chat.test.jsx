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
      expect(chatApi.sendRAGChatMessage).toHaveBeenCalledWith('ws-1', 'Explain paging', 5);
    });

    expect(await screen.findByText(/Paging is a memory management scheme/i)).toBeInTheDocument();
  });

  it('renders currency dollar amounts cleanly without KaTeX math corruption', () => {
    const input = "If a product's price increases from **$50** to **$60**:\n\n$$\\text{Difference} = 60 - 50 = 10$$";
    const processed = preprocessMarkdownForMath(input);
    expect(processed).toContain('**\\\\$50**');
    expect(processed).toContain('**\\\\$60**');
    expect(processed).toContain('$$\\text{Difference} = 60 - 50 = 10$$');
  });

  it('preserves valid inline LaTeX math expressions intact', () => {
    const input = "For example, $50\\%$ means 50 out of 100, which simplifies to the fraction $\\frac{1}{2}$ or the decimal $0.50$, multiply by $100$ and add the $\\%$ sign.";
    const processed = preprocessMarkdownForMath(input);
    expect(processed).toContain('$50\\%$');
    expect(processed).toContain('$\\frac{1}{2}$');
    expect(processed).toContain('$0.50$');
    expect(processed).toContain('$100$');
    expect(processed).toContain('$\\%$');
  });
});
