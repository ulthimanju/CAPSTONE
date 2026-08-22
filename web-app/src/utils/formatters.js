import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
} from '@/components/ui/icons';

/**
 * Formats a raw byte count into human-readable size string (e.g. 1.5 MB).
 * @param {number|string} bytes
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 1) {
  const num = Number(bytes);
  if (!num || isNaN(num) || num <= 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  return parseFloat((num / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex];
}

/**
 * Returns the appropriate Phosphor icon component for a file extension or filename.
 * @param {string} extOrFilename
 * @returns {React.ComponentType}
 */
export function getFileIcon(extOrFilename) {
  if (!extOrFilename) return FileText;
  const ext = extOrFilename.includes('.')
    ? extOrFilename.split('.').pop().toLowerCase()
    : extOrFilename.toLowerCase();

  if (['png', 'jpg', 'jpeg', 'tif', 'tiff', 'webp', 'svg', 'gif'].includes(ext)) {
    return ImageIcon;
  }
  if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext)) {
    return FileSpreadsheet;
  }
  if (['pptx', 'ppt', 'key'].includes(ext)) {
    return Presentation;
  }
  return FileText;
}

/**
 * Extracts normalized lowercase file extension from filename or path.
 * @param {string} filename
 * @returns {string}
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}
