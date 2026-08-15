import { z } from 'zod';

export const documentStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'PARSED',
  'INDEXED',
  'FAILED',
]);

export const fileTypeEnum = z.enum([
  'PDF',
  'DOCX',
  'WPS',
  'PPTX',
  'KEY',
  'XLSX',
  'CSV',
  'PNG',
  'JPG',
  'JPEG',
  'TIF',
  'TIFF',
  'TXT',
]);

export const documentResponseSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  uploaded_by: z.string().uuid().optional(),
  original_filename: z.string(),
  mime_type: z.string().optional().default('application/pdf'),
  file_extension: z.string(),
  file_size_bytes: z.number(),
  status: z.string(),
  parse_status: z.string().nullable().optional(),
  is_split: z.boolean().optional().default(false),
  part_count: z.number().optional().default(1),
  chunk_count: z.number().optional().default(0),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export const documentListResponseSchema = z.object({
  documents: z.array(documentResponseSchema),
  total: z.number(),
});

export const uploadDocumentFormSchema = z.object({
  file: z
    .custom((val) => typeof window !== 'undefined' && val instanceof File, 'File is required')
    .refine((file) => file && file.size > 0, 'File cannot be empty')
    .refine((file) => {
      if (!file) return false;
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isImage = ['png', 'jpg', 'jpeg', 'tif', 'tiff'].includes(ext || '');
      const maxBytes = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      return file.size <= maxBytes;
    }, 'File size exceeds maximum allowed limit (10MB for images, 50MB for documents)'),
});
