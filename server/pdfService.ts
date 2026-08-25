import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BoundingBox, DocumentChunk } from './types';

interface ExtractedTextItem { str: string; x: number; y: number; width: number; height: number; pageNumber: number; pageWidth: number; pageHeight: number; fontName?: string; }
interface PageData { pageNumber: number; pageWidth: number; pageHeight: number; text: string; items: ExtractedTextItem[]; paragraphs: { text: string; sectionTitle?: string; items: ExtractedTextItem[]; bbox: BoundingBox; }[]; }

export async function extractPdfContent(pdfBuffer: Buffer, documentId: string): Promise<{ pageCount: number; chunks: DocumentChunk[]; pages: PageData[]; rawText: string; }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), useSystemFonts: true, disableFontFace: true, isEvalSupported: false });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  const pages: PageData[] = [];
  let fullDocumentText = '';

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const items: ExtractedTextItem[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || typeof item.str !== 'string' || !item.str.trim()) continue;
      const transform = item.transform;
      const x = transform[4];
      const itemHeight = Math.max(Math.abs(transform[3]) || item.height || 10, 8);
      const itemWidth = Math.max(item.width || item.str.length * itemHeight * 0.5, 10);
      const y = Math.max(0, viewport.height - transform[5] - itemHeight);
      items.push({ str: item.str, x: Math.max(0, x), y, width: itemWidth, height: itemHeight, pageNumber: pageNum, pageWidth: viewport.width, pageHeight: viewport.height, fontName: item.fontName });
    }

    items.sort((a, b) => Math.abs(a.y - b.y) < 4 ? a.x - b.x : a.y - b.y);
    const paragraphs: PageData['paragraphs'] = [];
    let current: ExtractedTextItem[] = [];
    let sectionTitle = '';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prev = items[i - 1];
      const heading = /^(\d+\.|\bTable\s+\d+:|\bFigure\s+\d+:|[A-Z\s]{4,}:)/i.test(item.str.trim()) || item.height >= 12;
      if (heading) sectionTitle = item.str.trim();
      if (!prev) { current.push(item); continue; }
      const verticalGap = item.y - (prev.y + prev.height);
      const paragraphBreak = verticalGap > prev.height * 0.8 || heading;
      if (paragraphBreak && current.length) {
        const text = reconstructTextFromItems(current).trim();
        if (text) paragraphs.push({ text, sectionTitle, items: [...current], bbox: calculateItemsBoundingBox(current, viewport.width, viewport.height) });
        current = [item];
      } else current.push(item);
    }
    if (current.length) {
      const text = reconstructTextFromItems(current).trim();
      if (text) paragraphs.push({ text, sectionTitle, items: [...current], bbox: calculateItemsBoundingBox(current, viewport.width, viewport.height) });
    }

    const pageFullText = paragraphs.map((p) => p.text).join('\n\n');
    fullDocumentText += `\n--- PAGE ${pageNum} ---\n${pageFullText}`;
    pages.push({ pageNumber: pageNum, pageWidth: viewport.width, pageHeight: viewport.height, text: pageFullText, items, paragraphs });
  }

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;
  for (const page of pages) {
    let text = '';
    let chunkItems: ExtractedTextItem[] = [];
    let section = '';
    let startPosition = 0;
    for (const para of page.paragraphs) {
      if (text.length + para.text.length > 550 && text.length > 150) {
        chunks.push({ id: `chunk-${documentId}-${chunkIndex++}`, documentId, pageNumber: page.pageNumber, content: text.trim(), sectionTitle: section || `Page ${page.pageNumber}`, startPosition, endPosition: startPosition + text.length, boundingBox: calculateItemsBoundingBox(chunkItems, page.pageWidth, page.pageHeight), tokenCount: Math.ceil(text.length / 4) });
        text = para.text; chunkItems = [...para.items]; section = para.sectionTitle || section; startPosition += text.length;
      } else {
        text = text ? `${text}\n\n${para.text}` : para.text;
        chunkItems.push(...para.items);
        if (para.sectionTitle) section = para.sectionTitle;
      }
    }
    if (text.trim()) chunks.push({ id: `chunk-${documentId}-${chunkIndex++}`, documentId, pageNumber: page.pageNumber, content: text.trim(), sectionTitle: section || `Page ${page.pageNumber}`, startPosition, endPosition: startPosition + text.length, boundingBox: calculateItemsBoundingBox(chunkItems, page.pageWidth, page.pageHeight), tokenCount: Math.ceil(text.length / 4) });
  }
  return { pageCount, chunks, pages, rawText: fullDocumentText };
}

function reconstructTextFromItems(items: ExtractedTextItem[]): string {
  let result = '';
  let last: ExtractedTextItem | null = null;
  for (const item of items) {
    if (!last) result += item.str;
    else if (Math.abs(item.y - last.y) < 4) {
      const gap = item.x - (last.x + last.width);
      if (gap > 3 && !result.endsWith(' ') && !item.str.startsWith(' ')) result += ' ';
      result += item.str;
    } else result += `\n${item.str}`;
    last = item;
  }
  return result;
}

function calculateItemsBoundingBox(items: ExtractedTextItem[], pageWidth: number, pageHeight: number): BoundingBox {
  if (!items.length) return { x: 40, y: 40, width: Math.max(20, pageWidth - 80), height: 100, pageWidth, pageHeight };
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  for (const item of items) { minX = Math.min(minX, item.x); minY = Math.min(minY, item.y); maxX = Math.max(maxX, item.x + item.width); maxY = Math.max(maxY, item.y + item.height); }
  const pad = 4;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(pageWidth, maxX + pad); maxY = Math.min(pageHeight, maxY + pad);
  return { x: Math.round(minX), y: Math.round(minY), width: Math.round(Math.max(20, maxX - minX)), height: Math.round(Math.max(12, maxY - minY)), pageWidth: Math.round(pageWidth), pageHeight: Math.round(pageHeight) };
}
