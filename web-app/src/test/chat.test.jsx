import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from '@/features/chat/pages/ChatPage';
import * as chatApi from '@/features/chat/api/chatApi';

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

  it('renders empty chat state with suggested educational prompts', async () => {
    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: [] });

    renderWithClient(<ChatPage />);

    expect(await screen.findByText('Ask Your AI Study Tutor')).toBeInTheDocument();
    expect(screen.getByText(/Interactive tutoring anchored to your uploaded notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Explain the difference between Monolithic and Microkernel/i)).toBeInTheDocument();
  });

  it('renders existing messages with source citations', async () => {
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
        citations: [
          {
            document_id: 'doc-1',
            document_name: 'Operating_Systems.pdf',
            chunk_index: 2,
            snippet: 'During a context switch, the kernel saves the execution context in the PCB.',
            similarity_score: 0.89,
          },
        ],
        timestamp: '2026-08-15T10:00:05Z',
      },
    ];

    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: mockMessages });

    renderWithClient(<ChatPage />);

    expect(await screen.findByText('What is a process context switch?')).toBeInTheDocument();
    expect(screen.getByText(/A context switch is the mechanism/i)).toBeInTheDocument();
    expect(screen.getByText('Operating_Systems.pdf')).toBeInTheDocument();
    expect(screen.getByText('(89%)')).toBeInTheDocument();
  });

  it('sends question to RAG endpoint and saves updated history', async () => {
    const user = userEvent.setup();
    chatApi.fetchWorkspaceChat.mockResolvedValue({ messages: [] });
    chatApi.sendRAGChatMessage.mockResolvedValue({
      question: 'Explain paging',
      answer: 'Paging is a memory management scheme that eliminates the need for contiguous allocation.',
      citations: [
        {
          document_id: 'doc-2',
          document_name: 'Virtual_Memory.pdf',
          chunk_index: 0,
          snippet: 'Physical address space is divided into fixed-size frames.',
          similarity_score: 0.94,
        },
      ],
    });
    chatApi.saveWorkspaceChat.mockResolvedValue({ status: 'ok' });

    renderWithClient(<ChatPage />);

    const textarea = await screen.findByPlaceholderText(/Ask a question about this workspace/i);
    await user.type(textarea, 'Explain paging');

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(chatApi.sendRAGChatMessage).toHaveBeenCalledWith('ws-1', 'Explain paging', 5);
    });

    expect(await screen.findByText(/Paging is a memory management scheme/i)).toBeInTheDocument();
  });
});
