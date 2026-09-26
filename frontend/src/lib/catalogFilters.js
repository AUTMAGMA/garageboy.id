const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

export function filtersFromCarouselDestination(item) {
  const destination = item?.destination || {};
  if (item?.destination_type !== 'catalog_filter') {
    return { brand: 'all', series: 'all', model: 'all', mod: 'all' };
  }
  return {
    brand: destination.brand_id || 'all',
    series: destination.vehicle_model_id || 'all',
    model: destination.vehicle_generation_id || 'all',
    mod: destination.category_id || 'all',
  };
}

export function productBrandId(product) {
  return firstValue(product.brand_id, product.brand);
}

export function productBrandLabel(product) {
  return firstValue(product.brandLabel, product.brand_label, product.brand_name, product.brand);
}

export function productBrandSlug(product) {
  return firstValue(product.brandSlug, product.brand_slug, product.brand);
}

export function productSeriesId(product) {
  return firstValue(product.vehicle_model_id, product.series, product.seriesLabel);
}

export function productSeriesLabel(product) {
  return firstValue(product.seriesLabel, product.vehicle_model_label, product.series_label, product.series);
}

export function productGenerationId(product) {
  return firstValue(product.vehicle_generation_id, product.modelLabel, product.model_label);
}

export function productGenerationLabel(product) {
  return firstValue(product.modelLabel, product.vehicle_generation_label, product.model_label);
}

export function productCategoryId(product) {
  return firstValue(product.category_id, product.mod);
}

export function productCategoryLabel(product) {
  return firstValue(product.modLabel, product.category_label, product.category_name, product.mod);
}

export function matchesCatalogFilters(product, filters) {
  return (filters.brand === 'all' || String(productBrandId(product)) === String(filters.brand))
    && (filters.series === 'all' || String(productSeriesId(product)) === String(filters.series))
    && (filters.model === 'all' || String(productGenerationId(product)) === String(filters.model))
    && (filters.mod === 'all' || String(productCategoryId(product)) === String(filters.mod));
}

export function catalogOptions(products, getId, getLabel) {
  const seen = new Map();
  products.forEach((product) => {
    const id = getId(product);
    const label = getLabel(product);
    if (id !== undefined && id !== null && id !== '' && label !== undefined && label !== null && label !== '') {
      const key = String(id);
      if (!seen.has(key)) seen.set(key, { key, label: String(label) });
    }
  });
  return [{ key: 'all', label: 'All' }, ...seen.values()];
}

export function productMatchesSearch(product, query) {
  const value = [
    product.name,
    product.description,
    product.desc,
    productBrandLabel(product),
    productSeriesLabel(product),
    productGenerationLabel(product),
    productCategoryLabel(product),
    product.sku,
  ].filter(Boolean).join(' ').toLowerCase();
  return value.includes(query.trim().toLowerCase());
}
