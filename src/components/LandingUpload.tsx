import React from 'react';
import type { SampleDocConfig } from '../types';

interface Props {
  onFileUpload: (file: File) => void;
  onSelectSample?: (type: string) => void;
  sampleConfigs?: SampleDocConfig[];
  isProcessing?: boolean;
}

export const LandingUpload: React.FC<Props> = ({ onFileUpload, onSelectSample, sampleConfigs = [], isProcessing = false }) => (
  <section className="mx-auto flex min-h-full max-w-4xl items-center justify-center p-6">
    <div className="w-full rounded-2xl border border-white/10 bg-[#141414] p-8 text-center shadow-2xl">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#1b1b1b] text-[#C5A059] text-2xl">PDF</div>
      <h1 className="font-serif-luxury text-4xl font-semibold italic text-white">Interrogate your documents</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">Upload a PDF and ask natural-language questions. Answers are grounded against retrieved document passages.</p>
      <label className="mx-auto mt-7 flex max-w-md cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#C5A059]/40 bg-black/20 px-6 py-8 hover:bg-black/30">
        <span className="text-sm font-semibold text-[#DFBE7B]">{isProcessing ? 'Processing document…' : 'Choose a PDF file'}</span>
        <span className="mt-2 text-xs text-white/40">PDF only</span>
        <input hidden type="file" accept="application/pdf" disabled={isProcessing} onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])} />
      </label>
      {sampleConfigs.length > 0 && onSelectSample && <div className="mt-6"><p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/35">Try a sample</p><div className="flex flex-wrap justify-center gap-2">{sampleConfigs.map((sample) => <button key={sample.id} onClick={() => onSelectSample(sample.type)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65 hover:border-[#C5A059]/40 hover:text-white">{sample.title}</button>)}</div></div>}
    </div>
  </section>
);
