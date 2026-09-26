import {
  catalogOptions,
  filtersFromCarouselDestination,
  matchesCatalogFilters,
  productBrandId,
  productBrandLabel,
  productCategoryId,
  productCategoryLabel,
  productGenerationId,
  productGenerationLabel,
  productSeriesId,
  productSeriesLabel,
} from './catalogFilters';

const apiProduct = {
  brand_id: 'brand-1',
  brandLabel: 'Brand One',
  vehicle_model_id: 'model-1',
  seriesLabel: 'Model One',
  vehicle_generation_id: 'generation-1',
  modelLabel: 'Generation One',
  category_id: 'category-1',
  modLabel: 'Category One',
};

const savedProduct = {
  brand: 'saved-brand',
  series: 'saved-series',
  seriesLabel: 'Saved Model',
  modelLabel: 'Saved Generation',
  mod: 'saved-category',
  modLabel: 'Saved Category',
};

test('builds options from API ids and resolved labels', () => {
  expect(catalogOptions([apiProduct], productBrandId, productBrandLabel)).toEqual([
    { key: 'all', label: 'All' },
    { key: 'brand-1', label: 'Brand One' },
  ]);
  expect(catalogOptions([apiProduct], productSeriesId, productSeriesLabel)[1]).toEqual({
    key: 'model-1', label: 'Model One',
  });
  expect(catalogOptions([apiProduct], productGenerationId, productGenerationLabel)[1].key)
    .toBe('generation-1');
  expect(catalogOptions([apiProduct], productCategoryId, productCategoryLabel)[1].label)
    .toBe('Category One');
});

test('keeps legacy localStorage product fields filterable', () => {
  expect(matchesCatalogFilters(savedProduct, {
    brand: 'saved-brand', series: 'saved-series', model: 'Saved Generation', mod: 'saved-category',
  })).toBe(true);
});

test('does not invent labels when API references have no related label', () => {
  expect(catalogOptions([{ brand_id: 'unresolved-id' }], productBrandId, productBrandLabel))
    .toEqual([{ key: 'all', label: 'All' }]);
});

test('maps carousel destinations to catalog filter IDs', () => {
  const filters = filtersFromCarouselDestination({
    destination_type: 'catalog_filter',
    destination: { brand_id: 'b1', vehicle_model_id: 'm1', vehicle_generation_id: 'g1', category_id: 'c1' },
  });
  expect(filters).toEqual({ brand: 'b1', series: 'm1', model: 'g1', mod: 'c1' });
  expect(matchesCatalogFilters({
    brand_id: 'b1', vehicle_model_id: 'm1', vehicle_generation_id: 'g1', category_id: 'c1',
  }, filters)).toBe(true);
  expect(filtersFromCarouselDestination({ destination_type: 'all_catalog' }))
    .toEqual({ brand: 'all', series: 'all', model: 'all', mod: 'all' });
});
