import React from 'react';
import type { SourceCitation } from '../types';

export const SourceEvidenceCard: React.FC<{ source: SourceCitation; onView?: (source: SourceCitation) => void }> = ({ source, onView }) => (
  <article className="rounded-lg border border-white/10 bg-black/20 p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C5A059]">Page {source.pageNumber}</span>
      <span className="text-[10px] text-white/35">{Math.round(source.relevanceScore * 100)}% match</span>
    </div>
    <p className="mt-2 text-xs leading-5 text-white/60">{source.excerpt}</p>
    {onView && <button onClick={() => onView(source)} className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#DFBE7B] hover:text-white">View source</button>}
  </article>
);
