import React, { useMemo } from 'react';
import { BRANDS, MODS } from '../catalogData';
import ProductCard from './ProductCard';

function Row({ label, options, value, onSelect, valueKey = 'key', labelKey = 'label' }) {
  return (
    <div className="flex flex-col items-start gap-2 border-b border-dashed border-[#222] py-3 last:border-b-0 sm:flex-row">
      <div className="w-[80px] shrink-0 pt-1 text-[13px] text-[#888]">{label}</div>
      <div className="flex flex-1 flex-wrap gap-x-3 gap-y-2.5">
        {options.map((o) => {
          const v = o[valueKey];
          const active = value === v;
          return (
            <button key={v} onClick={() => onSelect(v)}
              className={`rounded px-3 py-1.5 text-[13px] transition-colors ${
                active ? 'bg-[#E31837] text-white' : 'bg-transparent text-[#ccc] hover:text-[#E31837]'
              }`}>
              {o[labelKey]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Catalog({ filters, setFilter, onOpen, products = [], loading = false, error = null }) {
  const { brand, series, model, mod } = filters;

  // dynamic series options for the selected brand
  const seriesOptions = useMemo(() => {
    const list = products.filter((p) => brand === 'all' || p.brand === brand);
    const seen = new Map();
    list.forEach((p) => { if (!seen.has(p.seriesLabel)) seen.set(p.seriesLabel, true); });
    return [{ key: 'all', label: 'All' }, ...[...seen.keys()].map((s) => ({ key: s, label: s }))];
  }, [products, brand]);

  // dynamic model options for brand + series
  const modelOptions = useMemo(() => {
    const list = products.filter((p) =>
      (brand === 'all' || p.brand === brand) && (series === 'all' || p.seriesLabel === series));
    const seen = new Map();
    list.forEach((p) => { if (p.modelLabel && !seen.has(p.modelLabel)) seen.set(p.modelLabel, true); });
    return [{ key: 'all', label: 'All' }, ...[...seen.keys()].map((m) => ({ key: m, label: m }))];
  }, [products, brand, series]);

  const items = useMemo(() => products.filter((p) =>
    (brand === 'all' || p.brand === brand) &&
    (series === 'all' || p.seriesLabel === series) &&
    (model === 'all' || p.modelLabel === model) &&
    (mod === 'all' || p.mod === mod)
  ), [products, brand, series, model, mod]);

  return (
    <div className="mx-auto my-8 w-[90%] max-w-[1280px]">
      <div className="mb-8 rounded border border-[#222] bg-[#0b0b0b] px-6 py-3">
        <Row label="Brand:" options={BRANDS} value={brand}
          onSelect={(v) => setFilter({ brand: v, series: 'all', model: 'all', mod })} />
        <Row label="Series:" options={seriesOptions} value={series}
          onSelect={(v) => setFilter({ brand, series: v, model: 'all', mod })} />
        <Row label="Model:" options={modelOptions} value={model}
          onSelect={(v) => setFilter({ brand, series, model: v, mod })} />
        <Row label="Mod:" options={MODS} value={mod}
          onSelect={(v) => setFilter({ brand, series, model, mod: v })} />
      </div>

      {error && (
        <p role="status" className="mb-4 text-sm text-white/50">
          Product API is unavailable. Showing the saved catalog when available.
        </p>
      )}

      {items.length === 0 && loading ? (
        <div role="status" className="py-12 text-center text-[16px] text-[#888]">Loading products…</div>
      ) : items.length === 0 && error ? (
        <div role="alert" className="py-12 text-center text-[16px] text-[#888]">Product catalog could not be loaded.</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-[16px] text-[#888]">No products found for selected filters</div>
      ) : (
        <>
          <p className="mb-4 text-[13px] text-[#666]">{items.length} products</p>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => <ProductCard key={p.id} product={p} onClick={onOpen} />)}
          </div>
        </>
      )}
    </div>
  );
}
