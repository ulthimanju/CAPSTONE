import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './utils';
import {
  documentResponseSchema,
  uploadDocumentFormSchema,
} from '@/features/documents/schemas/documentSchemas';
import { DocumentListTable } from '@/features/documents/components/DocumentListTable';
import { DocumentReaderPage } from '@/features/documents/pages/DocumentReaderPage';
import { Header } from '@/components/layout/Header';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { documentApi } from '@/features/documents/api/documentApi';

describe('Document Schemas & File Size Rules', () => {
  it('validates a DocumentResponse entity', () => {
    const validDoc = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      workspace_id: 'e4b3c2a1-0000-4000-8000-000000000001',
      original_filename: 'operating_systems_syllabus.pdf',
      mime_type: 'application/pdf',
      file_extension: 'PDF',
      file_size_bytes: 4500000,
      status: 'INDEXED',
      parse_status: 'COMPLETED',
      is_split: false,
      part_count: 1,
      chunk_count: 42,
      created_at: '2026-08-15T10:00:00Z',
    };

    const res = documentResponseSchema.safeParse(validDoc);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.original_filename).toBe('operating_systems_syllabus.pdf');
      expect(res.data.status).toBe('INDEXED');
    }
  });

  it('enforces 10MB limit for images and 50MB limit for documents', () => {
    // 8MB PNG -> Valid (<= 10MB)
    const validImage = new File(['a'.repeat(8 * 1024 * 1024)], 'diagram.png', { type: 'image/png' });
    expect(uploadDocumentFormSchema.safeParse({ file: validImage }).success).toBe(true);

    // 12MB PNG -> Invalid (> 10MB)
    const oversizedImage = new File(['a'.repeat(12 * 1024 * 1024)], 'huge_photo.jpg', { type: 'image/jpeg' });
    expect(uploadDocumentFormSchema.safeParse({ file: oversizedImage }).success).toBe(false);

    // 25MB PDF -> Valid (<= 50MB)
    const validLargeDoc = new File(['a'.repeat(25 * 1024 * 1024)], 'textbook.pdf', { type: 'application/pdf' });
    expect(uploadDocumentFormSchema.safeParse({ file: validLargeDoc }).success).toBe(true);

    // 55MB PDF -> Invalid (> 50MB)
    const oversizedDoc = new File(['a'.repeat(55 * 1024 * 1024)], 'massive_book.pdf', { type: 'application/pdf' });
    expect(uploadDocumentFormSchema.safeParse({ file: oversizedDoc }).success).toBe(false);
  });
});

describe('DocumentListTable Component', () => {
  const mockDocs = [
    {
      id: 'doc-1',
      workspace_id: 'ws-123',
      original_filename: 'Lecture_1_Introduction.pdf',
      file_extension: 'PDF',
      file_size_bytes: 2500000,
      status: 'INDEXED',
      parse_status: 'COMPLETED',
      created_at: '2026-08-15T09:30:00Z',
    },
    {
      id: 'doc-2',
      workspace_id: 'ws-123',
      original_filename: 'Course_Architecture.pptx',
      file_extension: 'PPTX',
      file_size_bytes: 18000000,
      status: 'PROCESSING',
      parse_status: 'PARSING',
      is_split: true,
      part_count: 2,
      created_at: '2026-08-15T09:35:00Z',
    },
  ];

  it('renders document items, parsed badges, and sliced parts', () => {
    renderWithProviders(<DocumentListTable workspaceId="ws-123" documents={mockDocs} />);

    expect(screen.getByText('Lecture_1_Introduction.pdf')).toBeInTheDocument();
    expect(screen.getByText('Course_Architecture.pptx')).toBeInTheDocument();

    expect(screen.getByText('INDEXED')).toBeInTheDocument();
    expect(screen.getByText('PARSING')).toBeInTheDocument();
    expect(screen.getByText(/Sliced \(2 parts\)/)).toBeInTheDocument();
  });

  it('opens ConfirmDialog when delete button is clicked and triggers deletion', async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.spyOn(documentApi, 'deleteDocument').mockResolvedValue({ success: true });

    renderWithProviders(<DocumentListTable workspaceId="ws-123" documents={mockDocs} />);

    const deleteBtns = screen.getAllByLabelText(/delete/i);
    await user.click(deleteBtns[0]);

    expect(screen.getByRole('heading', { name: /delete document/i })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "Lecture_1_Introduction.pdf"/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /delete document/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('doc-1');
    });
  });
});

describe('Direct Document Upload Flow in Header', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ activeWorkspaceId: 'ws-123' });
  });

  it('directly triggers upload mutation when file is selected without intermediary confirmation modal', async () => {
    const user = userEvent.setup();
    const uploadSpy = vi.spyOn(documentApi, 'uploadDocumentFile').mockResolvedValue({
      id: 'doc-new',
      workspace_id: 'ws-123',
      original_filename: 'Syllabus.pdf',
      file_extension: 'PDF',
      file_size_bytes: 1024,
      status: 'INDEXED',
      created_at: '2026-08-15T10:00:00Z',
    });

    renderWithProviders(<Header />);

    const uploadBtn = screen.getByRole('button', { name: /upload document/i });
    expect(uploadBtn).toBeInTheDocument();

    const file = new File(['sample content'], 'Syllabus.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-123',
          file: expect.any(File),
        })
      );
    });
  });

  it('rejects oversized image with error message', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Header />);

    // 15MB Image (> 10MB limit)
    const bigImage = new File(['a'.repeat(15 * 1024 * 1024)], 'screenshot.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, bigImage);

    expect(
      await screen.findByText(/image file size exceeds maximum allowed limit of 10 mb/i)
    ).toBeInTheDocument();
  });
});

describe('DocumentReaderPage Component', () => {
  const mockDoc = {
    id: 'doc-read-1',
    workspace_id: 'ws-123',
    original_filename: 'CS301_Virtual_Memory.pdf',
    file_extension: 'PDF',
    file_size_bytes: 3500000,
    status: 'INDEXED',
    parse_status: 'COMPLETED',
    chunk_count: 58,
    is_split: false,
    created_at: '2026-08-15T09:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(documentApi, 'getDocumentById').mockResolvedValue(mockDoc);
    vi.spyOn(documentApi, 'getDocumentParseResult').mockResolvedValue({
      document_id: 'doc-read-1',
      markdown_content: '# Chapter 1: Virtual Memory Paging\n\nVirtual memory maps virtual addresses to physical frames.',
    });
  });

  it('renders document reader with parsed markdown text and study action buttons', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/workspaces/:workspaceId/documents/:documentId" element={<DocumentReaderPage />} />
      </Routes>,
      {
        route: '/workspaces/ws-123/documents/doc-read-1',
      }
    );

    expect(await screen.findByText('CS301_Virtual_Memory.pdf')).toBeInTheDocument();
    expect(await screen.findByText(/Virtual memory maps virtual addresses to physical frames/)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /study flashcards/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate quiz/i })).toBeInTheDocument();
  });
});
