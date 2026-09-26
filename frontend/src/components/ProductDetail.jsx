import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, ZoomIn, Wrench, Layers } from 'lucide-react';
import { productImageSrc, useFallbackImage } from '../lib/productImage';
import { productBrandLabel } from '../lib/catalogFilters';

export default function ProductDetail({ product, related, onBack, onOpenProduct }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    setPage(0);
    setZoom(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product]);

  if (!product) return null;
  const sheets = product.sheets || [];
  const total = sheets.length;

  const specs = [
    { label: 'Brand', value: productBrandLabel(product) },
    { label: 'Series', value: product.seriesLabel },
    { label: 'Model / Year', value: product.modelLabel || '-' },
    { label: 'Part Type', value: product.modLabel },
    { label: 'Material', value: 'ABS / PP (carbon-look option)' },
    { label: 'Fitment', value: 'Direct bolt-on replacement' },
    { label: 'Finish', value: 'Primer / unpainted (paint to match)' },
  ];

  return (
    <div className="mx-auto my-8 w-[90%] max-w-[1200px]">
      <button onClick={onBack}
        className="fade-up mb-6 flex items-center gap-2 rounded bg-[#1a1a1a] px-4 py-2 text-[13px] text-white transition-colors hover:bg-[#E31837]">
        <ArrowLeft size={16} /> Back to catalog
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="fade-up d1 overflow-hidden rounded-lg border border-[#222] bg-[#0d0d0d]">
          <img src={productImageSrc(product.img)} alt={product.name} onError={useFallbackImage} className="h-full max-h-[440px] w-full object-cover" />
        </div>

        {/* Info */}
        <div className="fade-up d2">
          <p className="text-[12px] uppercase tracking-widest text-[#E31837]">{productBrandLabel(product)}</p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight text-white">{product.name}</h1>
          <p className="mt-2 text-[14px] text-[#aaa]">{product.desc}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#333] bg-[#111] px-3 py-1 text-[12px] text-[#ccc]">{product.seriesLabel}</span>
            {product.modelLabel && <span className="rounded-full border border-[#333] bg-[#111] px-3 py-1 text-[12px] text-[#ccc]">{product.modelLabel}</span>}
            <span className="rounded-full border border-[#E31837] bg-[#E31837]/10 px-3 py-1 text-[12px] text-[#E31837]">{product.modLabel}</span>
          </div>

          <div className="mt-6 rounded-lg border border-[#222] bg-[#0b0b0b] p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-white"><Wrench size={16} /> Specifications</h3>
            <dl className="divide-y divide-[#1c1c1c]">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 py-2 text-[13px]">
                  <dt className="text-[#888]">{s.label}</dt>
                  <dd className="text-right text-[#ddd]">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <a href="https://www.instagram.com/garageboy.id" target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded bg-[#E31837] px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#c01530]">
            Inquire this kit
          </a>
        </div>
      </div>

      {/* Part list catalog */}
      {total > 0 && (
        <div className="fade-up d3 mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-[18px] font-bold text-white"><Layers size={18} /> Part List Catalog</h2>
          <div className="overflow-hidden rounded-lg border border-[#222]">
            <div className={`relative bg-white ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} onClick={() => setZoom((z) => !z)}
              style={{ maxHeight: '70vh', overflow: 'auto' }}>
              <img src={productImageSrc(sheets[page])} alt={`part list ${page + 1}`} onError={useFallbackImage} className={`mx-auto ${zoom ? 'w-[150%] max-w-none' : 'w-full'} transition-[width] duration-200`} />
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
          </div>
        </div>
      )}

      {/* Related */}
      {related && related.length > 0 && (
        <div className="fade-up d4 mt-12">
          <h2 className="mb-4 text-[18px] font-bold text-white">More from {product.seriesLabel}</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <div key={p.id} onClick={() => onOpenProduct(p)}
                className="group cursor-pointer overflow-hidden rounded border border-[#222] bg-[#111] text-center transition-colors hover:border-[#E31837]">
                <div className="h-[150px] overflow-hidden bg-[#0d0d0d]">
                  <img src={productImageSrc(p.img)} alt={p.name} loading="lazy" onError={useFallbackImage} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="px-2 py-2.5">
                  <h4 className="text-[12px] text-[#ddd] transition-colors group-hover:text-[#E31837]">{p.name}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
