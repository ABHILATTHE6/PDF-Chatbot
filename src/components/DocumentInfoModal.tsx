import React from 'react';
import type { DocumentMetadata } from '../types';

interface Props { document: DocumentMetadata; isOpen: boolean; onClose: () => void; onDeleteDocument: () => void; }
export const DocumentInfoModal: React.FC<Props> = ({ document, isOpen, onClose, onDeleteDocument }) => !isOpen ? null : (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#171717] p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><h2 className="text-base font-semibold text-white">Document information</h2><p className="mt-1 text-xs text-white/45">{document.filename}</p></div><button onClick={onClose} className="text-white/40 hover:text-white">✕</button></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-lg bg-black/20 p-3"><dt className="text-white/35">Pages</dt><dd className="mt-1 text-white">{document.pageCount || '—'}</dd></div><div className="rounded-lg bg-black/20 p-3"><dt className="text-white/35">Status</dt><dd className="mt-1 text-white capitalize">{document.status}</dd></div><div className="rounded-lg bg-black/20 p-3"><dt className="text-white/35">Size</dt><dd className="mt-1 text-white">{Math.round(document.fileSize / 1024)} KB</dd></div><div className="rounded-lg bg-black/20 p-3"><dt className="text-white/35">Progress</dt><dd className="mt-1 text-white">{document.progressPercent}%</dd></div></dl>
      <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65">Close</button><button onClick={onDeleteDocument} className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300 hover:bg-red-500/25">Delete document</button></div>
    </div>
  </div>
);
