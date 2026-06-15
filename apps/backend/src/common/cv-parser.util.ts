// Extracts plain text from an uploaded CV file (PDF / DOCX / plain text) so HR
// users don't have to copy-paste the content by hand. PDF parsing uses
// `pdf-parse` (imported from its lib entry to avoid the package's debug-mode
// self-test that runs when imported via its index), DOCX uses `mammoth`.

import pdfParse = require('pdf-parse/lib/pdf-parse.js');
import mammoth = require('mammoth');

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function isSupportedCvType(mimetype: string, filename?: string): boolean {
  const lower = (filename || '').toLowerCase();
  return (
    mimetype === PDF_MIME ||
    mimetype === DOCX_MIME ||
    mimetype.startsWith('text/') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.txt')
  );
}

export async function extractCvText(
  buffer: Buffer,
  mimetype: string,
  filename?: string,
): Promise<string> {
  const lower = (filename || '').toLowerCase();

  if (mimetype === PDF_MIME || lower.endsWith('.pdf')) {
    const result = await pdfParse(buffer);
    return normalize(result.text);
  }

  if (mimetype === DOCX_MIME || lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return normalize(result.value);
  }

  // Plain text / fallback
  return normalize(buffer.toString('utf-8'));
}

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
