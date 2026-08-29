import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { BoundingBox, DocumentChunk } from './types';

export async function extractAndChunkPdf(pdfBuffer: Buffer, documentId: string): Promise<DocumentChunk[]> {
  const result = await extractPdfContent(pdfBuffer, documentId);
  return result.chunks;
}

export async function extractPdfContent(pdfBuffer: Buffer, documentId: string): Promise<{ pageCount: number; chunks: DocumentChunk[]; pages: unknown[]; rawText: string }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), useSystemFonts: true, disableFontFace: true, isEvalSupported: false });
  const pdfDoc = await loadingTask.promise;
  const pages: Array<{ pageNumber: number; text: string }> = [];
  let rawText = '';

  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
    const page = await pdfDoc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim();
    pages.push({ pageNumber, text });
    rawText += `\n--- PAGE ${pageNumber} ---\n${text}`;
  }

  const chunks: DocumentChunk[] = [];
  for (const page of pages) {
    if (!page.text) continue;
    const size = 550;
    for (let start = 0, index = 0; start < page.text.length; start += size, index++) {
      const content = page.text.slice(start, start + size).trim();
      if (!content) continue;
      const boundingBox: BoundingBox = { x: 0, y: 0, width: 1, height: 1, pageWidth: 1, pageHeight: 1 };
      chunks.push({
        id: `chunk-${documentId}-${chunks.length}`,
        documentId,
        pageNumber: page.pageNumber,
        content,
        sectionTitle: `Page ${page.pageNumber}`,
        startPosition: start,
        endPosition: start + content.length,
        boundingBox,
        tokenCount: Math.ceil(content.length / 4),
      });
    }
  }
  return { pageCount: pdfDoc.numPages, chunks, pages, rawText };
}
