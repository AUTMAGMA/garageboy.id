import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { asset } from '../lib/asset';

export default function CatalogViewer({ item, onClose }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    setPage(0);
    setZoom(false);
  }, [item]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setPage((p) => Math.min(p + 1, item.pages.length - 1));
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;
  const total = item.pages.length;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex max-h-[92vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-md border border-[#333] bg-[#0d0d0d]">
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#222] px-5 py-3">
          <div>
            <h3 className="text-[16px] font-bold text-white">GARAGE BOY · {item.title}</h3>
            {item.sub && <p className="text-[12px] text-[#888]">{item.sub}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"
            className="text-[#aaa] transition-colors hover:text-[#E31837]">
            <X size={26} />
          </button>
        </div>

        {/* page image */}
        <div className={`relative flex-1 overflow-auto bg-white ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={() => setZoom((z) => !z)}>
          <img src={asset(item.pages[page])} alt={`${item.title} page ${page + 1}`}
            className={`mx-auto ${zoom ? 'w-[160%] max-w-none' : 'w-full'} transition-[width] duration-200`} />
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[11px] text-white">
            <ZoomIn size={12} /> {zoom ? 'Click to fit' : 'Click to zoom'}
          </div>
        </div>

        {/* controls */}
        {total > 1 && (
          <div className="flex items-center justify-between border-t border-[#222] bg-black px-5 py-3">
            <button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}
              className="flex items-center gap-1 rounded bg-[#1a1a1a] px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-[#E31837] disabled:opacity-30 disabled:hover:bg-[#1a1a1a]">
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="text-[13px] text-[#888]">Sheet {page + 1} / {total}</span>
            <button onClick={() => setPage((p) => Math.min(p + 1, total - 1))} disabled={page === total - 1}
              className="flex items-center gap-1 rounded bg-[#1a1a1a] px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-[#E31837] disabled:opacity-30 disabled:hover:bg-[#1a1a1a]">
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
