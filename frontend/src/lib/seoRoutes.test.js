import {
  brandPath,
  catalogPathFromFilters,
  parseSeoRoute,
  productPath,
  vehicleGenerationPath,
  vehicleModelPath,
} from './seoRoutes';

const product = {
  id: 'product-id',
  slug: 'same-product-slug',
  name: 'BMW 3 Series',
  brand_id: 'brand-id',
  brandLabel: 'BMW',
  brandSlug: 'bmw',
  vehicle_model_id: 'model-id',
  seriesLabel: '3 Series',
  vehicle_generation_id: 'generation-id',
  modelLabel: 'G20',
  category_id: 'category-id',
  modLabel: 'Bodykit & Conversion',
};

test('SEO routes use stable IDs alongside readable slugs', () => {
  expect(productPath(product)).toBe('/products/same-product-slug/product-id');
  expect(brandPath({ id: product.brand_id, name: product.brandLabel })).toBe('/brands/bmw/brand-id');
  expect(vehicleModelPath({ id: product.brand_id, name: product.brandLabel }, { id: product.vehicle_model_id, name: product.seriesLabel }))
    .toBe('/vehicles/bmw/3-series/model-id');
  expect(vehicleGenerationPath(
    { id: product.brand_id, name: product.brandLabel },
    { id: product.vehicle_model_id, name: product.seriesLabel },
    { id: product.vehicle_generation_id, name: product.modelLabel },
  )).toBe('/vehicles/bmw/3-series/model-id/g20/generation-id');
});

test('direct paths and admin fragment resolve to their intended page types', () => {
  expect(parseSeoRoute({ pathname: '/products/same-product-slug/product-id', search: '', hash: '' }))
    .toEqual({ type: 'product', id: 'product-id' });
  expect(parseSeoRoute({ pathname: '/vehicles/bmw/3-series/model-id/g20/generation-id', search: '', hash: '' }))
    .toEqual({ type: 'vehicleGeneration', brandSlug: 'bmw', modelSlug: '3-series', modelId: 'model-id', generationSlug: 'g20', generationId: 'generation-id' });
  expect(parseSeoRoute({ pathname: '/', search: '', hash: '#admin' })).toEqual({ type: 'admin' });
});

test('catalog filter links retain the API IDs for brand, model, generation and category', () => {
  expect(catalogPathFromFilters({ brand: 'brand-id', series: 'all', model: 'all', mod: 'all' }, [product]))
    .toBe('/brands/bmw/brand-id');
  expect(catalogPathFromFilters({ brand: 'brand-id', series: 'model-id', model: 'all', mod: 'all' }, [product]))
    .toBe('/vehicles/bmw/3-series/model-id');
  expect(catalogPathFromFilters({ brand: 'brand-id', series: 'model-id', model: 'generation-id', mod: 'all' }, [product]))
    .toBe('/vehicles/bmw/3-series/model-id/g20/generation-id');
  expect(catalogPathFromFilters({ brand: 'all', series: 'all', model: 'all', mod: 'category-id' }, [product]))
    .toBe('/categories/bodykit-conversion/category-id');
});
