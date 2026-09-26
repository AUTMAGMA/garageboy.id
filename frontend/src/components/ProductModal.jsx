import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { asset } from '../lib/asset';

export default function ProductModal({ product, onClose }) {
  const [tab, setTab] = useState('photo'); // 'photo' | 'parts'
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => { setTab('photo'); setPage(0); setZoom(false); }, [product]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!product) return null;
  const sheets = product.sheets || [];
  const total = sheets.length;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex max-h-[92vh] w-full max-w-[820px] flex-col overflow-hidden rounded-md border border-[#333] bg-[#0d0d0d]">
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#222] px-5 py-3">
          <div>
            <h3 className="text-[16px] font-bold text-white">{product.name}</h3>
            <p className="text-[12px] text-[#888]">{product.desc}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[#aaa] transition-colors hover:text-[#E31837]">
            <X size={26} />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-2 border-b border-[#222] bg-black px-5 py-2">
          <button onClick={() => setTab('photo')}
            className={`rounded px-3 py-1.5 text-[13px] transition-colors ${tab === 'photo' ? 'bg-[#E31837] text-white' : 'text-[#ccc] hover:text-[#E31837]'}`}>
            Vehicle Photo
          </button>
          {total > 0 && (
            <button onClick={() => setTab('parts')}
              className={`rounded px-3 py-1.5 text-[13px] transition-colors ${tab === 'parts' ? 'bg-[#E31837] text-white' : 'text-[#ccc] hover:text-[#E31837]'}`}>
              Part List Catalog
            </button>
          )}
        </div>

        {/* body */}
        {tab === 'photo' ? (
          <div className="flex flex-1 items-center justify-center overflow-auto bg-[#0d0d0d] p-4">
            <img src={asset(product.img)} alt={product.name} className="max-h-[62vh] w-full object-contain" />
          </div>
        ) : (
          <>
            <div className={`relative flex-1 overflow-auto bg-white ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onClick={() => setZoom((z) => !z)}>
              <img src={asset(sheets[page])} alt={`part list ${page + 1}`}
                className={`mx-auto ${zoom ? 'w-[160%] max-w-none' : 'w-full'} transition-[width] duration-200`} />
              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[11px] text-white">
                <ZoomIn size={12} /> {zoom ? 'Click to fit' : 'Click to zoom'}
              </div>
            </div>
            {total > 1 && (
              <div className="flex items-center justify-between border-t border-[#222] bg-black px-5 py-3">
                <button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}
                  className="flex items-center gap-1 rounded bg-[#1a1a1a] px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-[#E31837] disabled:opacity-30">
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="text-[13px] text-[#888]">Sheet {page + 1} / {total}</span>
                <button onClick={() => setPage((p) => Math.min(p + 1, total - 1))} disabled={page === total - 1}
                  className="flex items-center gap-1 rounded bg-[#1a1a1a] px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-[#E31837] disabled:opacity-30">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
