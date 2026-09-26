import React, { useMemo } from 'react';
import {
  catalogOptions,
  matchesCatalogFilters,
  productBrandId,
  productBrandLabel,
  productCategoryId,
  productCategoryLabel,
  productGenerationId,
  productGenerationLabel,
  productMatchesSearch,
  productSeriesId,
  productSeriesLabel,
} from '../lib/catalogFilters';
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

export default function Catalog({ filters, setFilter, onOpen, products = [], loading = false, error = null, searchTerm = '' }) {
  const { brand, series, model, mod } = filters;

  const brandOptions = useMemo(
    () => catalogOptions(products, productBrandId, productBrandLabel),
    [products]
  );

  const seriesOptions = useMemo(() => {
    const list = products.filter((product) => brand === 'all' || String(productBrandId(product)) === String(brand));
    return catalogOptions(list, productSeriesId, productSeriesLabel);
  }, [products, brand]);

  const modelOptions = useMemo(() => {
    const list = products.filter((product) => (
      (brand === 'all' || String(productBrandId(product)) === String(brand))
      && (series === 'all' || String(productSeriesId(product)) === String(series))
    ));
    return catalogOptions(list, productGenerationId, productGenerationLabel);
  }, [products, brand, series]);

  const categoryOptions = useMemo(() => {
    const list = products.filter((product) => (
      (brand === 'all' || String(productBrandId(product)) === String(brand))
      && (series === 'all' || String(productSeriesId(product)) === String(series))
      && (model === 'all' || String(productGenerationId(product)) === String(model))
    ));
    return catalogOptions(list, productCategoryId, productCategoryLabel);
  }, [products, brand, series, model]);

  const items = useMemo(() => products.filter((p) =>
    matchesCatalogFilters(p, filters) && (!searchTerm.trim() || productMatchesSearch(p, searchTerm))
  ), [products, filters, searchTerm]);

  return (
    <div className="mx-auto my-8 w-[90%] max-w-[1280px]">
      <div className="mb-8 rounded border border-[#222] bg-[#0b0b0b] px-6 py-3">
        <Row label="Brand:" options={brandOptions} value={brand}
          onSelect={(v) => setFilter({ brand: v, series: 'all', model: 'all', mod: 'all' })} />
        <Row label="Series:" options={seriesOptions} value={series}
          onSelect={(v) => setFilter({ brand, series: v, model: 'all', mod: 'all' })} />
        <Row label="Model:" options={modelOptions} value={model}
          onSelect={(v) => setFilter({ brand, series, model: v, mod: 'all' })} />
        <Row label="Mod:" options={categoryOptions} value={mod}
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
