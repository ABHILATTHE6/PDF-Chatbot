import React from 'react';

export const ProcessingModal: React.FC<{ isOpen: boolean; filename: string }> = ({ isOpen, filename }) => !isOpen ? null : (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="w-[min(90vw,420px)] rounded-2xl border border-white/10 bg-[#171717] p-7 text-center shadow-2xl">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#C5A059]" />
      <h2 className="text-base font-semibold text-white">Processing PDF</h2>
      <p className="mt-2 break-all text-xs text-white/45">{filename}</p>
      <p className="mt-4 text-xs text-white/35">Extracting text and preparing the document for grounded retrieval.</p>
    </div>
  </div>
);
