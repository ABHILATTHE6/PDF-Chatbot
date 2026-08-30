import React, { useState } from 'react';
import type { DocumentMetadata } from '../types';

interface Props { document: DocumentMetadata; isOpen: boolean; onClose: () => void; }
export const GroundingTestModal: React.FC<Props> = ({ document, isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  if (!isOpen) return null;
  const runTest = async () => {
    setRunning(true); setStatus('Running grounding checks…');
    await new Promise((resolve) => setTimeout(resolve, 500));
    setStatus(`Grounding test prepared for ${document.filename}. Full evaluation suite can be connected to the RAG API next.`);
    setRunning(false);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#171717] p-6 shadow-2xl"><div className="flex justify-between"><div><h2 className="text-base font-semibold text-white">Grounding test</h2><p className="mt-1 text-xs text-white/40">Validate that answers stay within document evidence.</p></div><button onClick={onClose} className="text-white/40 hover:text-white">✕</button></div><div className="mt-5 rounded-xl border border-[#C5A059]/20 bg-[#C5A059]/5 p-4 text-xs leading-5 text-white/60">Document: <span className="text-white/85">{document.filename}</span><br/>Tests should verify supported questions, unsupported questions, citation presence, and confidence thresholds.</div>{status && <p className="mt-4 text-xs text-[#DFBE7B]">{status}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65">Close</button><button disabled={running} onClick={runTest} className="rounded-lg bg-[#C5A059] px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">{running ? 'Testing…' : 'Run test'}</button></div></div></div>;
};
