import React from 'react';
import type { DocumentMetadata, HighlightTarget } from '../types';

interface Props { documentId: string; metadata: DocumentMetadata; highlightTarget?: HighlightTarget | null; }
export const PDFViewer: React.FC<Props> = ({ documentId, metadata, highlightTarget }) => (
  <section className="h-full min-h-0 overflow-hidden rounded-xl border border-white/10 bg-[#141414]">
    <div className="flex items-center justify-between border-b border-white/10 bg-[#0f0f0f] px-4 py-3">
      <div><p className="text-xs font-semibold text-white">{metadata.filename}</p><p className="text-[10px] text-white/35">{metadata.pageCount || '—'} pages</p></div>
      {highlightTarget && <span className="text-[10px] uppercase tracking-wider text-[#C5A059]">Page {highlightTarget.pageNumber}</span>}
    </div>
    <div className="flex h-[calc(100%-53px)] items-center justify-center p-6 text-center">
      <div><div className="mx-auto mb-3 text-4xl">📄</div><p className="text-sm text-white/60">PDF viewer ready</p><p className="mt-1 text-xs text-white/30">Document ID: {documentId}</p><p className="mt-4 max-w-sm text-xs text-white/30">Source evidence is displayed in the chat panel. A full canvas/page renderer can be enabled in the next UI pass.</p></div>
    </div>
  </section>
);
