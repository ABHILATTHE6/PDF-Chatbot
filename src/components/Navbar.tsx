import React from 'react';
import type { DocumentMetadata, SampleDocConfig } from '../types';

interface Props {
  currentDocument: DocumentMetadata | null;
  onNewPdfClick: () => void;
  onSelectSample?: (type: string) => void;
  sampleConfigs?: SampleDocConfig[];
  onOpenGroundingTest?: () => void;
  onOpenDocInfo?: () => void;
  onClearChat?: () => void;
  confidenceThreshold?: number;
  onThresholdChange?: (value: number) => void;
}

export const Navbar: React.FC<Props> = ({ currentDocument, onNewPdfClick, onSelectSample, sampleConfigs = [], onOpenGroundingTest, onOpenDocInfo, onClearChat }) => (
  <header className="flex items-center justify-between border-b border-white/10 bg-[#0f0f0f] px-4 py-3 shrink-0">
    <div>
      <div className="font-serif-luxury text-lg font-bold text-white">PDF Intelligence</div>
      <div className="text-[9px] uppercase tracking-[0.25em] text-white/40">Grounded Document Assistant</div>
    </div>
    <nav className="flex items-center gap-2">
      {currentDocument && <button onClick={onOpenDocInfo} className="rounded border border-white/10 px-2.5 py-1.5 text-xs text-white/70 hover:text-white">Document</button>}
      {currentDocument && <button onClick={onClearChat} className="rounded border border-white/10 px-2.5 py-1.5 text-xs text-white/70 hover:text-white">Clear</button>}
      {currentDocument && <button onClick={onOpenGroundingTest} className="rounded border border-[#C5A059]/40 px-2.5 py-1.5 text-xs text-[#DFBE7B]">Grounding</button>}
      {sampleConfigs[0] && onSelectSample && <button onClick={() => onSelectSample(sampleConfigs[0].type)} className="hidden sm:inline rounded border border-white/10 px-2.5 py-1.5 text-xs text-white/70">Sample</button>}
      <button onClick={onNewPdfClick} className="rounded bg-[#C5A059] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#DFBE7B]">New PDF</button>
    </nav>
  </header>
);
